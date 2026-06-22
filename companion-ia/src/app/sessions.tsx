import { useCallback, useState } from 'react'
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import {
  addSession,
  describeDays,
  disableDailyReminder,
  enableDailyReminder,
  formatTime,
  getSessions,
  isDailyReminderOn,
  removeSession,
  WEEKDAYS,
  type Session,
} from '../lib/notifications'
import { type as typo, type Palette } from '../constants/type'
import { useTheme } from '../hooks/use-theme'
import { Toggle } from '../components/ui/Toggle'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

export default function SessionsScreen() {
  const colors = useTheme()

  const [sessions, setSessions] = useState<Session[]>([])
  const [hour, setHour] = useState(20)
  const [minute, setMinute] = useState(0)
  const [days, setDays] = useState<number[]>([2, 3, 4, 5, 6])
  const [denied, setDenied] = useState(false)
  const [dailyOn, setDailyOn] = useState(false)

  async function toggleDaily(on: boolean) {
    if (on) {
      const ok = await enableDailyReminder()
      setDailyOn(ok)
      if (!ok) setDenied(true)
    } else {
      await disableDailyReminder()
      setDailyOn(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      isDailyReminderOn().then(setDailyOn)
      getSessions().then(setSessions)
    }, []),
  )

  function toggleDay(id: number) {
    setDays((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))
  }

  async function create() {
    if (days.length === 0) return
    const created = await addSession(hour, minute, days)
    if (!created) {
      setDenied(true)
      return
    }
    setDenied(false)
    setSessions(await getSessions())
  }

  async function remove(id: string) {
    Alert.alert('Supprimer cette séance ?', 'Tu ne recevras plus de rappels à cette heure.', [
      { text: 'Garder', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await removeSession(id)
          setSessions(await getSessions())
        },
      },
    ])
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
        <Text style={[typo.caption as object, { color: colors.textMuted, padding: 24, textAlign: 'center' }]}>
          Les séances programmées sont disponibles sur l'application mobile.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typo.caption as object, { color: colors.textMuted }]}>
          Programme des rendez-vous doux avec ton compagnon. Tu recevras un rappel discret pour
          prendre un moment rien que pour toi. Tout reste sur ton téléphone.
        </Text>

        {/* Rappel quotidien simple (20h) — le réglage le plus courant, en un geste. */}
        <View style={[styles.dailyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[typo.label as object, { color: colors.text }]}>Rappel quotidien</Text>
            <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 2 }]}>
              Un coucou chaque soir à 20h
            </Text>
          </View>
          <Toggle value={dailyOn} onValueChange={toggleDaily} />
        </View>

        {/* Heure */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>HEURE</Text>
        <View style={styles.pickerRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {HOURS.map((h) => (
              <Chip key={h} active={h === hour} onPress={() => setHour(h)} colors={colors} label={String(h).padStart(2, '0')} />
            ))}
          </ScrollView>
        </View>
        <View style={styles.pills}>
          {MINUTES.map((m) => (
            <Chip key={m} active={m === minute} onPress={() => setMinute(m)} colors={colors} label={`:${String(m).padStart(2, '0')}`} />
          ))}
        </View>

        {/* Jours */}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>JOURS</Text>
        <View style={styles.daysRow}>
          {WEEKDAYS.map((w) => {
            const active = days.includes(w.id)
            return (
              <Pressable
                key={w.id}
                onPress={() => toggleDay(w.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={w.short}
                style={[
                  styles.dayCircle,
                  { borderColor: colors.border, backgroundColor: active ? colors.accent : colors.surface },
                ]}>
                <Text style={{ color: active ? colors.accentTx : colors.textMuted, fontFamily: 'Inter_600SemiBold' }}>{w.short}</Text>
              </Pressable>
            )
          })}
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: days.length ? colors.accent : colors.surfaceHigh }]}
          onPress={create}
          disabled={days.length === 0}
          activeOpacity={0.85}>
          <Text style={[typo.button as object, { color: days.length ? colors.accentTx : colors.textFaint }]}>
            Programmer pour {formatTime(hour, minute)}
          </Text>
        </TouchableOpacity>

        {denied ? (
          <Text style={[typo.caption as object, { color: colors.error, textAlign: 'center' }]}>
            Autorise les notifications dans les réglages de ton téléphone pour recevoir tes rappels.
          </Text>
        ) : null}

        {sessions.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textFaint, marginTop: 8 }]}>TES SÉANCES</Text>
            {sessions.map((s) => (
              <View key={s.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typo.subtitle as object, { color: colors.text }]}>{formatTime(s.hour, s.minute)}</Text>
                  <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 2 }]}>
                    {describeDays(s.days)}
                  </Text>
                </View>
                <Pressable onPress={() => remove(s.id)} hitSlop={10} style={styles.delete} accessibilityRole="button" accessibilityLabel="Supprimer cette séance">
                  <Text style={{ color: colors.textFaint, fontSize: 18 }} accessibilityElementsHidden importantForAccessibility="no">✕</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string
  active: boolean
  onPress: () => void
  colors: Palette
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.accent : colors.surface, borderColor: colors.border },
      ]}>
      <Text style={{ color: active ? colors.accentTx : colors.textMuted, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginTop: 8 },
  pickerRow: { marginHorizontal: -20 },
  pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, flexWrap: 'wrap' },
  chip: {
    minWidth: 46,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  daysRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  addBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  delete: { padding: 6 },
})
