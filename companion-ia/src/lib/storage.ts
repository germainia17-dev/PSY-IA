import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// Sur web (même machine que Ollama) → localhost. Sur mobile → IP du Mac.
const DEFAULT_OLLAMA_URL =
  Platform.OS === 'web' ? 'http://localhost:11434' : 'http://192.168.1.35:11434'

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

// Une conversation = une séance. L'index ne contient que les métadonnées
// (léger à charger), les messages vivent dans un blob séparé par id.
export type ConversationMeta = {
  id: string
  title: string
  preview: string
  createdAt: number
  updatedAt: number
  // Renseignés après coup par le résumé de séance (best-effort, peuvent manquer).
  summary?: string // « ce dont on a parlé », à la 2e personne
  themes?: string[] // thèmes courts en minuscules (ex: ["études","stress"])
}

export type Conversation = ConversationMeta & {
  messages: Message[]
}

export type MemoryFact = {
  id: string
  text: string
  createdAt: number
}

// Préférences de personnalisation visuelle. Restent sur l'appareil.
// `avatar` + `accent` sont gratuits ; `theme` + `tone` sont réservés au Pro.
// (Application à l'IA / au thème global = étape 2 — ici on ne fait que stocker.)
export type Personalization = {
  logo: string | null // data URI du logo uploadé par l'utilisateur (null = aucun)
  accent: string // id de couleur d'accent (cf. ACCENTS dans l'écran)
  theme: string // id de thème premium (Pro)
  tone: string // id de ton de l'IA premium (Pro)
}

export const DEFAULT_PERSONALIZATION: Personalization = {
  logo: null,
  accent: 'terracotta',
  theme: 'cream',
  tone: 'doux',
}

export const WELCOME_TEXT = "Salut, je suis là. Comment tu te sens aujourd'hui ?"
const DEFAULT_TITLE = 'Nouvelle conversation'
const MAX_FACTS = 40

const KEYS = {
  index: '@companion_convos_index',
  convo: (id: string) => `@companion_convo:${id}`,
  current: '@companion_current',
  memory: '@companion_memory',
  personalization: '@companion_personalization',
  name: '@companion_name',
  mood: '@companion_mood',
  ollamaUrl: '@ollama_url',
  ollamaModel: '@ollama_model',
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function titleFrom(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, 40) || DEFAULT_TITLE
}

// Clé de jour local "YYYY-M-D" pour regrouper conversations et humeurs par date.
function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Message d'accueil : personnalisé si on connaît le prénom, neutre sinon.
export function buildWelcome(name?: string | null): string {
  const n = name?.trim()
  return n
    ? `Salut ${n}, content de te rencontrer. Qu'est-ce qui t'amène aujourd'hui ?`
    : WELCOME_TEXT
}

// ── Conversations ─────────────────────────────────────────────

export async function listConversations(): Promise<ConversationMeta[]> {
  const raw = await AsyncStorage.getItem(KEYS.index)
  const list: ConversationMeta[] = raw ? JSON.parse(raw) : []
  return list.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const raw = await AsyncStorage.getItem(KEYS.convo(id))
  return raw ? JSON.parse(raw) : null
}

export function newConversation(name?: string | null): Conversation {
  const now = Date.now()
  return {
    id: uid(),
    title: DEFAULT_TITLE,
    preview: '',
    createdAt: now,
    updatedAt: now,
    messages: [{ role: 'assistant', content: buildWelcome(name) }],
  }
}

export async function saveConversation(convo: Conversation): Promise<Conversation> {
  const lastUser = [...convo.messages].reverse().find((m) => m.role === 'user')
  const last = convo.messages[convo.messages.length - 1]
  const updated: Conversation = {
    ...convo,
    title: convo.title === DEFAULT_TITLE && lastUser ? titleFrom(lastUser.content) : convo.title,
    preview: last ? last.content.replace(/\s+/g, ' ').slice(0, 80) : '',
    updatedAt: Date.now(),
    messages: convo.messages.slice(-120),
  }

  await AsyncStorage.setItem(KEYS.convo(updated.id), JSON.stringify(updated))

  // Sync cloud best-effort (non-bloquant, silencieux si offline)
  import('./sync').then(({ pushConversation }) => pushConversation(updated)).catch(() => {})

  const index = await listConversations()
  const { messages: _omit, ...meta } = updated
  const next = [meta, ...index.filter((c) => c.id !== updated.id)]
  await AsyncStorage.setItem(KEYS.index, JSON.stringify(next))
  return updated
}

export async function deleteConversation(id: string): Promise<void> {
  await AsyncStorage.removeItem(KEYS.convo(id))
  const index = await listConversations()
  await AsyncStorage.setItem(KEYS.index, JSON.stringify(index.filter((c) => c.id !== id)))
}

// Enregistre le résumé + les thèmes d'une séance, sur le blob ET dans l'index
// (pour que l'historique les affiche sans charger chaque conversation). On garde
// l'ancien si le nouveau est vide → une analyse ratée n'efface jamais un acquis.
export async function saveSessionSummary(
  id: string,
  summary: string,
  themes: string[],
): Promise<void> {
  const convo = await loadConversation(id)
  if (!convo) return
  const cleanThemes = themes
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 24)
    .slice(0, 4)
  const nextSummary = summary.trim().slice(0, 240) || convo.summary
  const nextThemes = cleanThemes.length ? cleanThemes : convo.themes
  const updated: Conversation = { ...convo, summary: nextSummary, themes: nextThemes }
  await AsyncStorage.setItem(KEYS.convo(id), JSON.stringify(updated))

  const index = await listConversations()
  const next = index.map((m) =>
    m.id === id ? { ...m, summary: nextSummary, themes: nextThemes } : m,
  )
  await AsyncStorage.setItem(KEYS.index, JSON.stringify(next))
}

// Thèmes récurrents agrégés sur les dernières séances, du plus fréquent au moins
// fréquent. Alimente l'écran d'évolution (« thèmes récurrents ») et la relance
// personnalisée. N'invente rien : compte ce qui a réellement été abordé.
export async function getRecentThemes(
  maxConvos = 12,
): Promise<{ theme: string; count: number }[]> {
  const list = (await listConversations()).slice(0, maxConvos)
  const counts = new Map<string, number>()
  for (const c of list) {
    for (const t of c.themes ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
}

// Pointeur vers la conversation ouverte (partagé entre chat et historique).
export async function setCurrentId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.current, id)
}

// La conversation courante (pointeur), sinon la plus récente, sinon une neuve.
export async function loadCurrentOrNew(): Promise<Conversation> {
  const currentId = await AsyncStorage.getItem(KEYS.current)
  if (currentId) {
    const convo = await loadConversation(currentId)
    if (convo) return convo
  }
  const index = await listConversations()
  if (index.length > 0) {
    const convo = await loadConversation(index[0].id)
    if (convo) return convo
  }
  return newConversation(await getUserName())
}

// ── Prénom de l'utilisateur ───────────────────────────────────
// Optionnel (l'app reste utilisable sans compte). Sert à personnaliser le tout
// premier message — l'effet "il me connaît" dès la première phrase.

export async function getUserName(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.name)
}

export async function setUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.name, name.trim().slice(0, 40))
}

// ── Parcours : série de présence + humeur du jour ─────────────
// Tout est local et dérivé de données déjà présentes (dates de conversations).
// Donne à l'utilisateur un signal visible qu'il revient et qu'il avance.

export type Mood = { date: string; value: number } // value 1 (dur) … 5 (super)

// Série de jours consécutifs avec au moins une conversation. Tolère un
// "aujourd'hui" encore vide tant qu'hier est plein (la série n'est pas cassée).
export async function getStreak(): Promise<number> {
  const days = new Set((await listConversations()).map((m) => dayKey(m.updatedAt)))
  if (days.size === 0) return 0
  const cursor = new Date()
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export async function getMoods(): Promise<Mood[]> {
  const raw = await AsyncStorage.getItem(KEYS.mood)
  return raw ? JSON.parse(raw) : []
}

export async function getTodayMood(): Promise<number | null> {
  const today = dayKey(Date.now())
  return (await getMoods()).find((m) => m.date === today)?.value ?? null
}

// Une seule humeur par jour : on remplace celle d'aujourd'hui si elle existe.
export async function setTodayMood(value: number): Promise<void> {
  const today = dayKey(Date.now())
  const next = [...(await getMoods()).filter((m) => m.date !== today), { date: today, value }]
  await AsyncStorage.setItem(KEYS.mood, JSON.stringify(next.slice(-90)))
}

// ── Mémoire locale ────────────────────────────────────────────
// Faits durables sur l'utilisateur. Restent sur l'appareil, jamais sur le
// serveur — ils sont seulement injectés dans le prompt le temps d'une requête.

export async function getMemory(): Promise<MemoryFact[]> {
  const raw = await AsyncStorage.getItem(KEYS.memory)
  return raw ? JSON.parse(raw) : []
}

export async function setMemory(facts: MemoryFact[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.memory, JSON.stringify(facts.slice(-MAX_FACTS)))
}

// Ajoute des faits en ignorant les doublons (comparaison insensible à la casse).
export async function addMemoryFacts(texts: string[]): Promise<MemoryFact[]> {
  const existing = await getMemory()
  const seen = new Set(existing.map((f) => f.text.trim().toLowerCase()))
  const now = Date.now()
  let i = 0
  for (const t of texts) {
    const clean = t.trim()
    const key = clean.toLowerCase()
    if (clean.length < 3 || seen.has(key)) continue
    seen.add(key)
    existing.push({ id: uid() + (i++).toString(36), text: clean.slice(0, 200), createdAt: now })
  }
  const next = existing.slice(-MAX_FACTS)
  await setMemory(next)
  return next
}

export async function removeMemoryFact(id: string): Promise<void> {
  const facts = await getMemory()
  await setMemory(facts.filter((f) => f.id !== id))
}

export async function clearMemory(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.memory)
}

// ── Personnalisation ──────────────────────────────────────────
// Choix visuels de l'utilisateur (avatar, accent, thème, ton). Fusionnés avec
// les valeurs par défaut pour rester robustes si on ajoute des champs plus tard.

export async function getPersonalization(): Promise<Personalization> {
  const raw = await AsyncStorage.getItem(KEYS.personalization)
  if (!raw) return DEFAULT_PERSONALIZATION
  try {
    return { ...DEFAULT_PERSONALIZATION, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PERSONALIZATION
  }
}

// Applique une mise à jour partielle et renvoie l'état complet enregistré.
export async function setPersonalization(patch: Partial<Personalization>): Promise<Personalization> {
  const current = await getPersonalization()
  const next = { ...current, ...patch }
  await AsyncStorage.setItem(KEYS.personalization, JSON.stringify(next))
  return next
}

// ── Ollama (mode dev local) ───────────────────────────────────

export async function getOllamaUrl(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.ollamaUrl)) ?? DEFAULT_OLLAMA_URL
}

export async function saveOllamaUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ollamaUrl, url)
}

export async function getOllamaModel(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.ollamaModel)) ?? 'llama3.1:8b'
}

export async function saveOllamaModel(model: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ollamaModel, model)
}
