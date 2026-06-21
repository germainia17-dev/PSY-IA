import { useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Orb } from '../components/orb'
import { palettes } from '../constants/type'
import { SPRING } from '../constants/motion'
import { addMemoryFacts, setUserName } from '../lib/storage'

export const ONBOARDED_KEY = 'companion.onboarded'

const INTENTS = [
  { id: 'stress', label: 'Évacuer du stress' },
  { id: 'sommeil', label: 'Mieux dormir' },
  { id: 'motivation', label: 'Retrouver de l\'élan' },
  { id: 'parler', label: 'Juste parler' },
] as const

const STATUSES = [
  { id: 'student', label: 'Étudiant·e' },
  { id: 'working', label: 'En activité' },
  { id: 'entrepreneur', label: 'Commerce / Auto-entrepreneur' },
  { id: 'seeking', label: 'En recherche' },
  { id: 'other', label: 'Autre' },
] as const

export default function OnboardingScreen() {
  const router = useRouter()
  const colors = palettes.dark
  const [step, setStep] = useState<0 | 1>(0)
  const [pressed, setPressed] = useState(false)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [intent, setIntent] = useState<string | null>(null)

  const orbScale = useSharedValue(0)
  const titleOp = useSharedValue(0)
  const titleY = useSharedValue(12)
  const subOp = useSharedValue(0)
  const subY = useSharedValue(10)
  const contentOp = useSharedValue(0)
  const contentY = useSharedValue(16)

  useEffect(() => {
    orbScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 110, mass: 1.2 }))
    const t = setTimeout(() => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }, 300)

    titleOp.value = withDelay(900, withTiming(1, { duration: 500 }))
    titleY.value = withDelay(900, withSpring(0, SPRING.soft))
    subOp.value = withDelay(1300, withTiming(1, { duration: 500 }))
    subY.value = withDelay(1300, withSpring(0, SPRING.soft))
    contentOp.value = withDelay(1900, withTiming(1, { duration: 400 }))
    contentY.value = withDelay(1900, withSpring(0, SPRING.soft))

    return () => clearTimeout(t)
  }, [step])

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: orbScale.value }] }))
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOp.value,
    transform: [{ translateY: titleY.value }],
  }))
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOp.value,
    transform: [{ translateY: subY.value }],
  }))
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOp.value,
    transform: [{ translateY: contentY.value }],
  }))

  async function handleStart() {
    if (pressed) return
    setPressed(true)
    const facts: string[] = []
    const clean = name.trim()
    if (clean) {
      await setUserName(clean)
      facts.push(`Se prénomme ${clean}`)
    }
    if (status) {
      const label = STATUSES.find((s) => s.id === status)?.label
      if (label) facts.push(`Profil : ${label}`)
    }
    if (intent) {
      const label = INTENTS.find((i) => i.id === intent)?.label
      if (label) facts.push(`Est venu·e pour : ${label.toLowerCase()}`)
    }
    if (facts.length) await addMemoryFacts(facts)
    await AsyncStorage.setItem(ONBOARDED_KEY, '1')
    router.replace('/')
  }

  function handleNext() {
    if (step < 1) {
      setStep((step + 1) as 0 | 1)
      orbScale.value = 0
      titleOp.value = 0
      titleY.value = 12
      subOp.value = 0
      subY.value = 10
      contentOp.value = 0
      contentY.value = 16
    }
  }

  function getProgressDots() {
    return Array.from({ length: 2 }, (_, i) => i <= step)
  }

  const canNext = step < 1

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Progress bar */}
      <View style={styles.progress}>
        {getProgressDots().map((active, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: active ? colors.accent : colors.border }]}
          />
        ))}
      </View>

      <View style={styles.center}>
        {step === 0 && (
          <>
            <Animated.View style={orbStyle}>
              <Orb state="idle" size={140} />
            </Animated.View>
            <Animated.Text style={[styles.title, { color: colors.text }, titleStyle]}>
              Bonjour. Je suis là.
            </Animated.Text>
            <Animated.Text style={[styles.subtitle, { color: colors.textMuted }, subStyle]}>
              Un espace à toi, local, sans jugement.
            </Animated.Text>
          </>
        )}

        {step === 1 && (
          <>
            <Animated.Text style={[styles.title, { color: colors.text }, titleStyle]}>
              Parle-moi
            </Animated.Text>
            <Animated.Text style={[styles.subtitle, { color: colors.textMuted }, subStyle]}>
              Optionnel — tous les champs sont à ton rythme.
            </Animated.Text>
            <Animated.View style={[styles.formContainer, contentStyle]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ton prénom (optionnel)"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="words"
                returnKeyType="done"
                style={[styles.nameField, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Ton statut</Text>
                <View style={styles.chipsContainer}>
                  {STATUSES.map((s) => {
                    const active = status === s.id
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setStatus(active ? null : s.id)}
                        style={[
                          styles.statusChip,
                          { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentSoft : colors.surface },
                        ]}>
                        <Text style={{ color: active ? colors.accentTx : colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' }}>
                          {s.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Pourquoi es-tu venu ?</Text>
                <View style={styles.chipsContainer}>
                  {INTENTS.map((i) => {
                    const active = intent === i.id
                    return (
                      <Pressable
                        key={i.id}
                        onPress={() => setIntent(active ? null : i.id)}
                        style={[
                          styles.intentChip,
                          { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentSoft : colors.surface },
                        ]}>
                        <Text style={{ color: active ? colors.accentTx : colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 13 }}>
                          {i.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            </Animated.View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPressIn={() => {}}
          onPressOut={() => {}}
          onPress={canNext ? handleNext : handleStart}
          disabled={step === 1 && pressed}
          style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={[styles.buttonText, { color: colors.bg }]}>
            {step === 1 ? 'Commencer' : 'Suivant'}
          </Text>
        </Pressable>
        <Text style={[styles.caption, { color: colors.textFaint }]}>
          {step === 0 && 'Aucun compte requis'}
          {step !== 0 && 'Tous les champs sont optionnels'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 32 },
  progress: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingTop: 32, paddingBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 32,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 8,
  },
  formContainer: { alignSelf: 'stretch', marginTop: 24, gap: 20, maxHeight: '60%' },
  nameField: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  section: { gap: 8 },
  sectionLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  statusChip: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  intentChip: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  footer: { paddingBottom: 56, gap: 14, alignItems: 'center' },
  button: {
    height: 52,
    borderRadius: 26,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, letterSpacing: -0.1 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13 },
})
