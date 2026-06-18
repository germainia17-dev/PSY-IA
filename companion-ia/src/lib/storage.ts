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
}

export type Conversation = ConversationMeta & {
  messages: Message[]
}

export type MemoryFact = {
  id: string
  text: string
  createdAt: number
}

export const WELCOME_TEXT = "Salut, je suis là. Comment tu te sens aujourd'hui ?"
const DEFAULT_TITLE = 'Nouvelle conversation'
const MAX_FACTS = 40

const KEYS = {
  index: '@companion_convos_index',
  convo: (id: string) => `@companion_convo:${id}`,
  current: '@companion_current',
  memory: '@companion_memory',
  ollamaUrl: '@ollama_url',
  ollamaModel: '@ollama_model',
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function titleFrom(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, 40) || DEFAULT_TITLE
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

export function newConversation(): Conversation {
  const now = Date.now()
  return {
    id: uid(),
    title: DEFAULT_TITLE,
    preview: '',
    createdAt: now,
    updatedAt: now,
    messages: [{ role: 'assistant', content: WELCOME_TEXT }],
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
  return newConversation()
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
