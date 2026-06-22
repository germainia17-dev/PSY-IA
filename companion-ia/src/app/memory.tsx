import { useCallback, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { clearMemory, getMemory, removeMemoryFact, type MemoryFact } from '../lib/storage'
import { type as typo } from '../constants/type'
import { useTheme } from '../hooks/use-theme'

export default function MemoryScreen() {
  const colors = useTheme()
  const [facts, setFacts] = useState<MemoryFact[]>([])

  const refreshMemory = useCallback(async () => {
    setFacts(await getMemory())
  }, [])

  useFocusEffect(
    useCallback(() => {
      refreshMemory()
      // Recharger après délai pour couvrir l'extraction asynchrone en cours
      const timer = setTimeout(refreshMemory, 3000)
      return () => clearTimeout(timer)
    }, [refreshMemory]),
  )

  async function remove(id: string) {
    await removeMemoryFact(id)
    setFacts(await getMemory())
  }

  function confirmClear() {
    Alert.alert('Tout oublier', 'Companion oubliera tout ce qu\'il sait sur toi. Action irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Tout oublier',
        style: 'destructive',
        onPress: async () => {
          await clearMemory()
          setFacts([])
        },
      },
    ])
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <View style={styles.intro}>
        <Text style={[typo.caption as object, { color: colors.textMuted }]}>
          Ce que ton compagnon retient de vous, pour des échanges plus justes au fil du temps. Tout
          reste sur cet appareil — rien n'est envoyé ni stocké ailleurs. Tu peux retirer un souvenir
          à tout moment.
        </Text>
      </View>

      <FlatList
        data={facts}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center', marginTop: 32 }]}>
            Rien en mémoire pour l'instant. Au fil de vos conversations, Companion retiendra
            naturellement ce qui compte pour toi.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            <Text style={[typo.message as object, { color: colors.text, flex: 1 }]}>{item.text}</Text>
            <Pressable onPress={() => remove(item.id)} hitSlop={10} style={styles.delete} accessibilityRole="button" accessibilityLabel="Oublier ce souvenir">
              <Text style={{ color: colors.textFaint, fontSize: 16 }} accessibilityElementsHidden importantForAccessibility="no">✕</Text>
            </Pressable>
          </View>
        )}
      />

      {facts.length > 0 ? (
        <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.error }]} onPress={confirmClear}>
          <Text style={[typo.label as object, { color: colors.error }]}>Tout oublier</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  intro: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  delete: { padding: 4 },
  clearBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
