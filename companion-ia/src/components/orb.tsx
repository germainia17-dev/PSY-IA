import { useEffect } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useLogo } from '../lib/use-logo'

const DEFAULT_LOGO = require('../assets/companion-logo.png')

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

export function Orb({ state, size = 120 }: { state: OrbState; size?: number }) {
  const logo = useLogo()
  const displayLogo = logo || DEFAULT_LOGO

  const glowScale = useSharedValue(1)
  const glowOpacity = useSharedValue(0.35)

  useEffect(() => {
    const dur = state === 'thinking' ? 650 : state === 'speaking' ? 950 : 2600
    const maxOpacity = state === 'thinking' ? 0.7 : state === 'speaking' ? 0.55 : 0.35
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.28, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    )
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.0, { duration: dur }),
        withTiming(maxOpacity, { duration: dur }),
      ),
      -1,
    )
  }, [state])

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }))

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.glow,
          glowStyle,
          { width: size * 1.5, height: size * 1.5, borderRadius: size * 0.75 },
        ]}
      />
      <Image
        source={typeof displayLogo === 'string' ? { uri: displayLogo } : displayLogo}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(199,122,74,0.2)',
  },
})
