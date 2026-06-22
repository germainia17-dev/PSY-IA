// Confettis de déblocage Pro — 100 % Reanimated (web + natif, zéro dépendance).
// Monté seulement quand `visible` passe à true ; chaque pièce tombe avec une
// dérive et une rotation propres, puis s'efface. onDone se déclenche à la fin.
import { useEffect, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { CONFETTI_COLORS } from '../constants/design'

const COUNT = 44
const DURATION = 2200

type PieceProps = { width: number; height: number; index: number }

function Piece({ width, height, index }: PieceProps) {
  // Tirages stables : calculés une seule fois au montage de la pièce.
  const [p] = useState(() => ({
    startX: Math.random() * width,
    drift: (Math.random() - 0.5) * 180,
    size: 7 + Math.random() * 9,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delay: Math.random() * 280,
    rot: (Math.random() - 0.5) * 720,
  }))

  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(p.delay, withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }))
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: t.value * (height + 60) - 30 },
      { translateX: p.drift * t.value },
      { rotate: `${p.rot * t.value}deg` },
    ],
    opacity: t.value < 0.85 ? 1 : Math.max(0, (1 - t.value) / 0.15),
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: p.startX,
          top: -30,
          width: p.size,
          height: p.size * 0.62,
          backgroundColor: p.color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  )
}

export function Confetti({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!visible) return
    // Reduced-motion : pas de pluie de confettis — on solde l'état tout de suite.
    const timer = setTimeout(onDone, reduced ? 0 : DURATION + 450)
    return () => clearTimeout(timer)
  }, [visible, onDone, reduced])

  if (!visible || reduced) return null

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <Piece key={i} index={i} width={width} height={height} />
      ))}
    </View>
  )
}
