import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { getMoods, getStreak, getRecentThemes, listConversations, type Mood } from '../lib/storage'
import { type as typo, type Palette } from '../constants/type'
import { useTheme } from '../hooks/use-theme'

const MOOD_EMOJI = ['😔', '😕', '😐', '🙂', '😄']
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Mon parcours — un signal visible de présence et de progression. Tout est
// dérivé du local (dates de conversations + humeurs), rien de neuf à stocker.
export default function JourneyScreen() {
  const colors = useTheme()
  const [streak, setStreak] = useState(0)
  const [moods, setMoods] = useState<Mood[]>([])
  const [convos, setConvos] = useState(0)
  const [days, setDays] = useState(0)
  const [themes, setThemes] = useState<{ theme: string; count: number }[]>([])

  useFocusEffect(
    useCallback(() => {
      getStreak().then(setStreak)
      getMoods().then(setMoods)
      getRecentThemes().then(setThemes)
      listConversations().then((list) => {
        setConvos(list.length)
        setDays(new Set(list.map((c) => dayKey(new Date(c.updatedAt)))).size)
      })
    }, []),
  )

  const moodByDay = new Map(moods.map((m) => [m.date, m.value]))

  // Les 7 derniers jours, du plus ancien au plus récent.
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { letter: DAY_LETTERS[d.getDay()], value: moodByDay.get(dayKey(d)) ?? null }
  })

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 44 }}>🔥</Text>
          <Text style={[typo.title as object, { color: colors.text }]}>
            {streak} jour{streak > 1 ? 's' : ''}
          </Text>
          <Text style={[typo.caption as object, { color: colors.textMuted }]}>
            {streak > 0 ? 'de présence à toi, sans interruption' : 'Reviens demain pour lancer ta série'}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>CES 7 DERNIERS JOURS</Text>
        <View style={[styles.weekRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {week.map((d, i) => (
            <View key={i} style={styles.dayCol}>
              {d.value ? (
                <Text style={{ fontSize: 24 }}>{MOOD_EMOJI[d.value - 1]}</Text>
              ) : (
                <View style={[styles.emptyDot, { borderColor: colors.border }]} />
              )}
              <Text style={[typo.caption as object, { color: colors.textFaint }]}>{d.letter}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <Stat value={convos} label="conversations" colors={colors} />
          <Stat value={days} label={days > 1 ? 'jours de présence' : 'jour de présence'} colors={colors} />
        </View>

        {themes.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>CE QUI T'OCCUPE</Text>
            <View style={[styles.themesContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {themes.slice(0, 5).map((t, i) => (
                <View key={i} style={styles.themeRow}>
                  <Text style={[typo.caption as object, { color: colors.text, flex: 1 }]}>{t.theme}</Text>
                  <Text style={[typo.caption as object, { color: colors.textMuted }]}>×{t.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center', marginTop: 8 }]}>
          Ton parcours reste sur cet appareil. Personne d'autre n'y a accès.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Stat({ value, label, colors }: { value: number; label: string; colors: Palette }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typo.title as object, { color: colors.accent }]}>{value}</Text>
      <Text style={[typo.caption as object, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginTop: 8, marginLeft: 4 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayCol: { alignItems: 'center', gap: 8, flex: 1 },
  emptyDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 20,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themesContainer: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
})
