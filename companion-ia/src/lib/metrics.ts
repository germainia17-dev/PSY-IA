import { supabase } from './supabase'
import { getMoods } from './storage'

// Suivi de santé FIABLE. Les données viennent de `daily_metrics` (humeur/stress
// déduits du sentiment de conversation côté serveur + compteur de messages),
// complétées par les humeurs saisies localement. Plus aucun score fabriqué.

export type Period = 'week' | 'month' | 'year'

export type MetricPoint = {
  day: string // "YYYY-MM-DD"
  mood: number | null // 1..5
  stress: number | null // 1..5
  messages: number
}

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// La clé locale des humeurs est "YYYY-M-D" (cf. storage) → on la normalise.
function normLocalKey(k: string): string {
  const [y, m, d] = k.split('-')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function periodStart(period: Period, end: Date): Date {
  const start = new Date(end)
  if (period === 'week') start.setDate(end.getDate() - 6)
  else if (period === 'month') start.setDate(end.getDate() - 29)
  else start.setFullYear(end.getFullYear() - 1)
  start.setHours(0, 0, 0, 0)
  return start
}

// Renvoie la série journalière de la période, BORNÉE à la première donnée réelle.
// Conséquence directe : un compte récent n'affiche jamais de jours « fantômes »
// antérieurs à sa première activité (fini la fausse progression d'octobre).
export async function getDailyMetrics(period: Period): Promise<MetricPoint[]> {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = periodStart(period, end)

  // Cloud : daily_metrics (RLS → chacun lit les siens).
  const cloud = new Map<string, { mood: number | null; stress: number | null; messages: number }>()
  try {
    const { data } = await supabase
      .from('daily_metrics')
      .select('day, mood, stress, messages')
      .gte('day', isoDay(start))
    for (const r of data ?? []) {
      cloud.set(String(r.day), {
        mood: r.mood ?? null,
        stress: r.stress ?? null,
        messages: r.messages ?? 0,
      })
    }
  } catch {
    // hors-ligne : on continue avec les seules humeurs locales
  }

  // Humeurs locales (complètent / précèdent la synchro cloud).
  const localMood = new Map<string, number>()
  try {
    for (const m of await getMoods()) localMood.set(normLocalKey(m.date), m.value)
  } catch {
    // pas d'humeur locale : pas grave
  }

  const points: MetricPoint[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const key = isoDay(cur)
    const c = cloud.get(key)
    points.push({
      day: key,
      mood: c?.mood ?? localMood.get(key) ?? null,
      stress: c?.stress ?? null,
      messages: c?.messages ?? 0,
    })
    cur.setDate(cur.getDate() + 1)
  }

  // Borne au premier jour porteur d'une vraie donnée.
  const firstReal = points.findIndex(
    (p) => p.mood !== null || p.stress !== null || p.messages > 0,
  )
  return firstReal === -1 ? [] : points.slice(firstReal)
}

// Progrès d'humeur honnête : moyenne des 7 derniers jours vs les 7 précédents.
// Retourne le delta en points de % (positif = ça va mieux), ou null si pas assez
// de données. Sert UNIQUEMENT à encourager quand la hausse est RÉELLE.
export function moodWeekDelta(points: MetricPoint[]): number | null {
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)
  const last = avg(points.slice(-7).map((p) => p.mood).filter((v): v is number => v != null))
  const prev = avg(points.slice(-14, -7).map((p) => p.mood).filter((v): v is number => v != null))
  if (last == null || prev == null) return null
  // 1..5 → écart en % (échelle de 4 points).
  return Math.round(((last - prev) / 4) * 100)
}
