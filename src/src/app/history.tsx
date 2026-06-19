import { useCallback, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  deleteConversation,
  listConversations,
  newConversation,
  saveConversation,
  setCurrentId,
  type ConversationMeta,
} from '../lib/storage'
import { palettes, type as typo } from '../constants/type'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay) return `Aujourd'hui · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function HistoryScreen() {
  const scheme = useColorScheme()
  const colors = palettes[scheme === 'dark' ? 'dark' : 'light']
  const router = useRouter()
  const [items, setItems] = useState<ConversationMeta[]>([])

  useFocusEffect(
    useCallback(() => {
      listConversations().then(setItems)
    }, []),
  )

  async function openConvo(id: string) {
    await setCurrentId(id)
    router.back()
  }

  async function startNew() {
    const fresh = await saveConversation(newConversation())
    await setCurrentId(fresh.id)
    router.back()
  }

  function confirmDelete(item: ConversationMeta) {
    Alert.alert('Supprimer cette conversation', `« ${item.title} » sera effacée de cet appareil.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(item.id)
          setItems(await listConversations())
        },
      },
    ])
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <TouchableOpacity style={[styles.newBtn, { backgroundColor: colors.accent }]} onPress={startNew} activeOpacity={0.85}>
        <Text style={[typo.button as object, { color: colors.accentTx }]}>＋  Nouvelle conversation</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center', marginTop: 40 }]}>
            Tes conversations passées apparaîtront ici.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => openConvo(item.id)}
            onLongPress={() => confirmDelete(item)}>
            <View style={{ flex: 1 }}>
              <Text style={[typo.label as object, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.preview ? (
                <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
                  {item.preview}
                </Text>
              ) : null}
              <Text style={[styles.date, { color: colors.textFaint }]}>{formatDate(item.updatedAt)}</Text>
            </View>
            <Pressable onPress={() => confirmDelete(item)} hitSlop={10} style={styles.delete}>
              <Text style={{ color: colors.textFaint, fontSize: 18 }}>✕</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  newBtn: {
    height: 50,
    borderRadius: 16,
    margin: 16,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  date: { fontSize: 12, marginTop: 6 },
  delete: { padding: 6 },
})
