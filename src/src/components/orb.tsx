import { useEffect } from 'react'
import { StyleSheet, View, useColorScheme } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SPRING } from '../constants/motion'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient)

// L'orbe : la présence physique du compagnon. 4 couches, 4 états.
// Corps et halo respirent à des rythmes différents (2600/3200ms, non divisibles)
// pour que la pulsation ne se resynchronise jamais — organisme, pas boucle.
export function Orb({ state, size = 120 }: { state: OrbState; size?: number }) {
  const scheme = useColorScheme()
  const isDark = scheme !== 'light'

  const bodyScale = useSharedValue(1)
  const haloScale = useSharedValue(1)
  const haloOpacity = useSharedValue(0.35)
  const coreOpacity = useSharedValue(0.6)
  const coreScale = useSharedValue(1)
  const refletRotate = useSharedValue(0)

  useEffect(() => {
    cancelAnimation(bodyScale)
    cancelAnimation(coreScale)
    cancelAnimation(coreOpacity)
    cancelAnimation(refletRotate)
    refletRotate.value = withTiming(0, { duration: 300 })

    if (state === 'idle') {
      haloOpacity.value = withTiming(0.35, { duration: 400 })
      bodyScale.value = withSequence(
        withTiming(1, { duration: 300 }),
        withRepeat(withTiming(1.04, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true),
      )
      coreOpacity.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true)
      coreScale.value = withSpring(1, SPRING.soft)
    } else if (state === 'listening') {
      // Il se concentre : noyau actif, respiration ralentie
      haloOpacity.value = withTiming(0.5, { duration: 400 })
      coreOpacity.value = withTiming(1, { duration: 300 })
      coreScale.value = withRepeat(withTiming(1.25, { duration: 600, easing: Easing.inOut(Easing.sin) }), -1, true)
      bodyScale.value = withRepeat(withTiming(1.04, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true)
    } else if (state === 'thinking') {
      // Effort : respiration courte, reflet qui tourne lentement
      haloOpacity.value = withTiming(0.35, { duration: 400 })
      bodyScale.value = withRepeat(
        withSequence(
          withTiming(0.96, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      )
      refletRotate.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1)
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 300 }),
          withTiming(1, { duration: 300 }),
          withTiming(1.3, { duration: 300 }),
          withTiming(1, { duration: 300 }),
          withTiming(1, { duration: 1200 }),
        ),
        -1,
      )
    } else if (state === 'speaking') {
      // Il pose ses mots : amplitude +50%, halo qui s'allume
      haloOpacity.value = withSequence(withTiming(0.6, { duration: 300 }), withTiming(0.35, { duration: 800 }))
      coreScale.value = withSequence(withTiming(1.2, { duration: 120 }), withSpring(1, SPRING.bounce))
      coreOpacity.value = withTiming(1, { duration: 200 })
      bodyScale.value = withRepeat(withTiming(1.06, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true)
    }
  }, [state])

  useEffect(() => {
    // Halo déphasé en permanence — jamais synchrone avec le corps
    haloScale.value = withRepeat(withTiming(1.08, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true)
    return () => {
      cancelAnimation(haloScale)
    }
  }, [])

  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ scale: bodyScale.value }] }))
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }))
  const coreStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
    transform: [{ scale: coreScale.value }],
  }))
  const refletStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refletRotate.value}deg` }],
  }))

  const s = size / 120 // ratio depuis la taille de référence

  // Monochrome : sphère argent sur fond sombre, graphite sur fond clair.
  const bodyColors: [string, string, string] = isDark
    ? ['#FAFAFA', '#A1A1AA', '#52525B']
    : ['#52525B', '#27272A', '#09090B']
  const haloColors: [string, string, string] = isDark
    ? ['#FAFAFA', '#A1A1AA', 'transparent']
    : ['#3F3F46', '#18181B', 'transparent']

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Couche 0 — halo (déborde 1.5×) */}
      <AnimatedGradient
        colors={haloColors}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.abs,
          haloStyle,
          { width: size * 1.5, height: size * 1.5, borderRadius: size * 0.75 },
        ]}
      />
      {/* Couche 1 — corps (gradient asymétrique volontaire) */}
      <Animated.View style={[bodyStyle, { width: size, height: size }]}>
        <LinearGradient
          colors={bodyColors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
        {/* Couche 2 — reflet décentré haut-gauche (volume) */}
        <Animated.View
          style={[
            styles.abs,
            refletStyle,
            { width: size, height: size, alignItems: 'flex-start' },
          ]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 64 * s,
              height: 64 * s,
              borderRadius: 32 * s,
              marginTop: 22 * s,
              marginLeft: 26 * s,
              opacity: 0.8,
            }}
          />
        </Animated.View>
        {/* Couche 3 — noyau (pulse de vie) */}
        <View style={[styles.abs, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
          <Animated.View
            style={[
              coreStyle,
              {
                width: 28 * s,
                height: 28 * s,
                borderRadius: 14 * s,
                backgroundColor: '#FFFFFF',
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
})
