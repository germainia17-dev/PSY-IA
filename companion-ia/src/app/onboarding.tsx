import { useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
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
import { palettes } from '../constants/design'
import { SPRING } from '../constants/motion'

export const ONBOARDED_KEY = 'companion.onboarded'

// Premier contact. Fond sombre quel que soit le thème : on naît dans le calme.
// Timeline : orbe (naissance, spring + haptique) → titre → sous-titre → bouton.
export default function OnboardingScreen() {
  const router = useRouter()
  const colors = palettes.dark
  const [pressed, setPressed] = useState(false)

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
          Un espace à toi. Chiffré, sans jugement.
        </Animated.Text>
      </View>

      <Animated.View style={[styles.footer, btnStyle]}>
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
  button: {
    height: 54,
    borderRadius: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, letterSpacing: -0.1 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13 },
})
