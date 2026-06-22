import { useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Polyline, Defs, LinearGradient, Stop, Circle } from 'react-native-svg'
import { usePro } from '../lib/use-pro'
import { useTheme } from '../hooks/use-theme'
import { getDailyMetrics, moodWeekDelta, type MetricPoint, type Period } from '../lib/metrics'
import { enableEvolutionReminder } from '../lib/notifications'
import { type as typo } from '../constants/type'
import { useRouter } from 'expo-router'

const MIN_DAYS = 3 // en dessous, on motive plutôt que d'afficher une courbe vide

// Étiquette d'axe X à partir d'un jour "YYYY-MM-DD".
function dayLabel(day: string, period: Period): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return period === 'year'
    ? date.toLocaleDateString('fr-FR', { month: 'short' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric' })
}

type SeriePoint = { value: number; label: string }

// Construit une série 0–100 pour un graphe donné : on saute les jours sans
// donnée AVANT la première valeur, puis on reporte la dernière valeur connue
// pour les trous internes (courbe continue sans inventer de tendance).
function buildSeries(
  points: MetricPoint[],
  period: Period,
  toPercent: (p: MetricPoint) => number | null,
): SeriePoint[] {
  const series: SeriePoint[] = []
  let last: number | null = null
  for (const p of points) {
    const v = toPercent(p)
    if (v != null) last = v
    if (last == null) continue // trous de tête : on n'affiche pas encore
    series.push({ value: last, label: dayLabel(p.day, period) })
  }
  return series
}

function PercentChart({ series, color }: { series: SeriePoint[]; color: string }) {
  const width = 320
  const height = 200
  const padding = 30
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Une seule valeur : on duplique pour tracer une petite ligne plate visible.
  const pts = series.length === 1 ? [series[0], series[0]] : series

  const coords = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * chartWidth + padding
    const y = height - padding - (p.value / 100) * chartHeight
    return { x, y }
  })
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ')

  const labelEvery = Math.max(1, Math.floor(pts.length / 6))
  const labels = pts.filter((_, i) => i % labelEvery === 0)

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Polyline points={polyline} fill="url(#gradFill)" stroke="none" />
        <Polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <Circle key={`pt-${i}`} cx={c.x} cy={c.y} r="3" fill={color} opacity="0.6" />
        ))}
      </Svg>
      <View style={[styles.labelsXContainer, { width }]}>
        {labels.map((p, i) => (
          <Text
            key={`lab-${i}`}
            style={[
              styles.axisLabelX,
              { marginLeft: (chartWidth / Math.max(labels.length - 1, 1)) * i - 15 },
            ]}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  )
}

function GraphCard({
  title,
  caption,
  series,
  color,
  colors,
}: {
  title: string
  caption: string
  series: SeriePoint[]
  color: string
  colors: ReturnType<typeof useTheme>
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typo.label as object, { color: colors.text }]}>{title}</Text>
      {series.length === 0 ? (
        <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 10 }]}>
          Pas encore assez d'échanges pour ce graphe. Continue à parler, il se
          remplira tout seul.
        </Text>
      ) : (
        <PercentChart series={series} color={color} />
      )}
      <Text style={[typo.caption as object, { color: colors.textMuted, lineHeight: 18 }]}>
        {caption}
      </Text>
    </View>
  )
}

export default function EvolutionScreen() {
  const colors = useTheme()
  const { pro } = usePro()
  const router = useRouter()

  const [period, setPeriod] = useState<Period>('week')
  const [points, setPoints] = useState<MetricPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pro) enableEvolutionReminder().catch(() => {})
  }, [pro])

  useEffect(() => {
    setLoading(true)
    getDailyMetrics(period)
      .then(setPoints)
      .finally(() => setLoading(false))
  }, [period])

  if (!pro) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
        <View
          style={[
            styles.gateContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[typo.title as object, { color: colors.text, marginBottom: 16 }]}>
            Réservé aux abonnés
          </Text>
          <Text
            style={[
              typo.label as object,
              { color: colors.textMuted, marginBottom: 24, lineHeight: 20 },
            ]}>
            Suis ton humeur, ton stress et ton engagement avec des graphiques
            fiables, basés sur tes vraies conversations.
          </Text>
          <Pressable
            onPress={() => router.push('/paywall' as never)}
            style={({ pressed }) => [
              styles.gateCta,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Text style={[typo.button as object, { color: colors.accentTx }]}>Débloquer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const moodSeries = buildSeries(points, period, (p) =>
    p.mood != null ? ((p.mood - 1) / 4) * 100 : null,
  )
  const stressSeries = buildSeries(points, period, (p) =>
    p.stress != null ? ((p.stress - 1) / 4) * 100 : null,
  )
  // Engagement : 8 messages/jour = pleine activité (indice plafonné à 100).
  const engagementSeries = buildSeries(points, period, (p) =>
    p.messages > 0 ? Math.min(p.messages / 8, 1) * 100 : null,
  )

  const delta = moodWeekDelta(points)
  const enoughData = points.length >= MIN_DAYS

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sélecteur de période */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              accessibilityRole="button"
              accessibilityState={{ selected: period === p }}
              accessibilityLabel={p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
              style={({ pressed }) => [
                styles.periodPill,
                period === p
                  ? [{ backgroundColor: colors.accent }, styles.periodPillActive]
                  : [{ backgroundColor: colors.surface, borderColor: colors.border }],
                pressed && { opacity: 0.8 },
              ]}>
              <Text
                style={[
                  typo.button as object,
                  { color: period === p ? colors.accentTx : colors.text, fontSize: 13 },
                ]}>
                {p === 'week' ? '1S' : p === 'month' ? '1M' : '1A'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : !enoughData ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 },
            ]}>
            <Text style={[typo.subtitle as object, { color: colors.text, marginBottom: 8 }]}>
              Ton suivi démarre
            </Text>
            <Text style={[typo.label as object, { color: colors.textMuted, lineHeight: 20 }]}>
              Reviens discuter quelques jours : tes graphiques d'humeur, de stress
              et d'engagement se construiront à partir de tes vraies
              conversations. Aucune donnée inventée.
            </Text>
          </View>
        ) : (
          <>
            {/* Encouragement HONNÊTE : seulement si la hausse est réelle. */}
            {delta != null && delta > 0 ? (
              <View style={[styles.banner, { backgroundColor: colors.accent }]}>
                <Text style={[typo.label as object, { color: colors.accentTx }]}>
                  +{delta}% d'humeur cette semaine. Continue, ça marche. ✦
                </Text>
              </View>
            ) : null}

            <GraphCard
              title="Humeur générale"
              caption="Déduite de tes échanges et de ton humeur du jour. Plus haut = mieux."
              series={moodSeries}
              color={colors.chartMood}
              colors={colors}
            />
            <GraphCard
              title="Stress"
              caption="Niveau de tension perçu dans tes conversations. Plus bas = plus apaisé."
              series={stressSeries}
              color={colors.chartStress}
              colors={colors}
            />
            <GraphCard
              title="Capacité à parler"
              caption="Ton engagement au fil des jours. Plus tu parles, plus je peux t'aider."
              series={engagementSeries}
              color={colors.chartEngagement}
              colors={colors}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 40, paddingHorizontal: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingBottom: 16,
  },
  banner: {
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  labelsXContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginTop: -8,
  },
  axisLabelX: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    opacity: 0.5,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 16,
  },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  periodPillActive: {
    borderWidth: 0,
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gateContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: 40,
  },
  gateCta: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
