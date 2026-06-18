import { supabase } from './supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Conversation, ConversationMeta } from './storage'

const KEYS = {
  index: '@companion_convos_index',
  convo: (id: string) => `@companion_convo:${id}`,
}

// Upsert une conversation vers Supabase. Fire-and-forget — jamais bloquant.
export async function pushConversation(convo: Conversation): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await supabase.from('conversations').upsert(
    {
      id: convo.id,
      user_id: session.user.id,
      title: convo.title,
      preview: convo.preview,
      created_at: new Date(convo.createdAt).toISOString(),
      updated_at: new Date(convo.updatedAt).toISOString(),
      messages: convo.messages,
    },
    { onConflict: 'id,user_id' },
  )
}

// Télécharge toutes les conversations distantes et les merge dans AsyncStorage
// (last-write-wins sur updated_at). Utilisé après login sur un nouveau device.
export async function pullConversations(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { data: remoteRows, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false })

  if (error || !remoteRows) return

  const rawIndex = await AsyncStorage.getItem(KEYS.index)
  const localIndex: ConversationMeta[] = rawIndex ? JSON.parse(rawIndex) : []
  const localMap = new Map(localIndex.map((c) => [c.id, c]))

  const nextIndex = [...localIndex]

  for (const row of remoteRows) {
    const remoteUpdated = new Date(row.updated_at).getTime()
    const local = localMap.get(row.id)

    if (!local || remoteUpdated > local.updatedAt) {
      const convo: Conversation = {
        id: row.id,
        title: row.title,
        preview: row.preview,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: remoteUpdated,
        messages: row.messages ?? [],
      }
      await AsyncStorage.setItem(KEYS.convo(row.id), JSON.stringify(convo))

      const { messages: _omit, ...meta } = convo
      void _omit
      if (!local) {
        nextIndex.push(meta)
      } else {
        const idx = nextIndex.findIndex((c) => c.id === row.id)
        if (idx !== -1) nextIndex[idx] = meta
      }
    }
  }

  await AsyncStorage.setItem(KEYS.index, JSON.stringify(nextIndex.sort((a, b) => b.updatedAt - a.updatedAt)))
}

// Sync bidirectionnel : pousse les locaux plus récents, tire les distants plus récents.
export async function syncConversations(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  try {
    const { data: remoteRows, error } = await supabase
      .from('conversations')
      .select('id, updated_at')
      .eq('user_id', session.user.id)

    if (error) return

    const remoteMap = new Map(
      (remoteRows ?? []).map((r: { id: string; updated_at: string }) => [
        r.id,
        new Date(r.updated_at).getTime(),
      ]),
    )

    const rawIndex = await AsyncStorage.getItem(KEYS.index)
    const localIndex: ConversationMeta[] = rawIndex ? JSON.parse(rawIndex) : []

    // Push locaux plus récents ou absents du remote
    for (const meta of localIndex) {
      const remoteTs = remoteMap.get(meta.id)
      if (remoteTs === undefined || meta.updatedAt > remoteTs) {
        const raw = await AsyncStorage.getItem(KEYS.convo(meta.id))
        if (raw) {
          const convo: Conversation = JSON.parse(raw)
          await pushConversation(convo)
        }
      }
      remoteMap.delete(meta.id)
    }

    // Pull distants non présents en local (devices multiples)
    if (remoteMap.size > 0) {
      await pullConversations()
    }
  } catch {
    // Sync best-effort : une erreur réseau n'est jamais fatale
  }
}
