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

// Pourquoi la personne ouvre l'app. Capté ici, réinjecté dans la mémoire AVANT
// le premier message → l'IA sait déjà ce qui l'amène.
const INTENTS = [
  { id: 'stress', label: 'Évacuer du stress' },
  { id: 'sommeil', label: 'Mieux dormir' },
  { id: 'motivation', label: 'Retrouver de l’élan' },
  { id: 'parler', label: 'Juste parler' },
] as const

// Premier contact. Fond sombre quel que soit le thème : on naît dans le calme.
// Timeline : orbe (naissance, spring + haptique) → titre → sous-titre → bouton.
export default function OnboardingScreen() {
  const router = useRouter()
  const colors = palettes.dark
  const [pressed, setPressed] = useState(false)
  const [name, setName] = useState('')
  const [intent, setIntent] = useState<string | null>(null)

  const orbScale = useSharedValue(0)
  const titleOp = useSharedValue(0)
  const titleY = useSharedValue(12)
  const subOp = useSharedValue(0)
  const subY = useSharedValue(10)
  const btnOp = useSharedValue(0)
  const btnY = useSharedValue(16)
  const btnScale = useSharedValue(1)

  useEffect(() => {
    // Naissance de l'orbe — la seule fois où il apparaît de nulle part
    orbScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 110, mass: 1.2 }))
    const t = setTimeout(() => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }, 300)

    titleOp.value = withDelay(900, withTiming(1, { duration: 500 }))
    titleY.value = withDelay(900, withSpring(0, SPRING.soft))
    subOp.value = withDelay(1300, withTiming(1, { duration: 500 }))
    subY.value = withDelay(1300, withSpring(0, SPRING.soft))
    btnOp.value = withDelay(1900, withTiming(1, { duration: 400 }))
    btnY.value = withDelay(1900, withSpring(0, SPRING.soft))

    return () => clearTimeout(t)
  }, [])

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: orbScale.value }] }))
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOp.value,
    transform: [{ translateY: titleY.value }],
  }))
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOp.value,
    transform: [{ translateY: subY.value }],
  }))
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOp.value,
    transform: [{ translateY: btnY.value }, { scale: btnScale.value }],
  }))

  async function handleStart() {
    if (pressed) return
    setPressed(true)
    // Le prénom et l'intention sont optionnels (l'app reste sans compte). Mais
    // s'ils sont donnés, on les écrit en mémoire AVANT le premier message : l'IA
    // les connaît dès sa première phrase, et l'accueil devient personnalisé.
    const facts: string[] = []
    const clean = name.trim()
    if (clean) {
      await setUserName(clean)
      facts.push(`Se prénomme ${clean}`)
    }
    if (intent) {
      const label = INTENTS.find((i) => i.id === intent)?.label
      if (label) facts.push(`Est venu·e pour : ${label.toLowerCase()}`)
    }
    if (facts.length) await addMemoryFacts(facts)
    await AsyncStorage.setItem(ONBOARDED_KEY, '1')
    router.replace('/')
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Animated.View style={orbStyle}>
          <Orb state="idle" size={140} />
        </Animated.View>
        <Animated.Text style={[styles.title, { color: colors.text }, titleStyle]}>
          Bonjour. Je suis là.
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { color: colors.textMuted }, subStyle]}>
          Un espace à toi, local, sans jugement.
        </Animated.Text>
      </View>

      <Animated.View style={[styles.footer, btnStyle]}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ton prénom (facultatif)"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="words"
          returnKeyType="done"
          style={[styles.nameField, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        />

        <View style={styles.intents}>
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
                <Text style={{ color: active ? colors.accentTx : colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 14 }}>
                  {i.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Pressable
          onPressIn={() => (btnScale.value = withSpring(0.97, SPRING.press))}
          onPressOut={() => (btnScale.value = withSpring(1, SPRING.press))}
          onPress={handleStart}
          style={[styles.button, { backgroundColor: colors.accent }]}>
          {/* Texte sombre sur accent : contraste signature, pas du blanc par défaut */}
          <Text style={[styles.buttonText, { color: colors.bg }]}>Commencer</Text>
        </Pressable>
        <Text style={[styles.caption, { color: colors.textFaint }]}>Aucun compte requis</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 48,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: { paddingBottom: 56, gap: 14, alignItems: 'center' },
  nameField: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  intents: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  intentChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
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
