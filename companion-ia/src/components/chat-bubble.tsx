import { useEffect } from 'react'
import { StyleSheet, Text, useColorScheme } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { type as typo, type Palette } from '../constants/type'
import { SPRING } from '../constants/motion'
import type { Message } from '../lib/storage'

// Entrées différenciées : l'assistant arrive "depuis l'orbe" (haut-gauche,
// spring doux), le user "de soi" (bas, snappy). Marges asymétriques — la
// conversation penche naturellement, rien n'est centré-plat.
export function ChatBubble({
  message,
  colors,
  animate,
}: {
  message: Message
  colors: Palette
  animate: boolean
}) {
  const isUser = message.role === 'user'
  const scheme = useColorScheme()
  const isDark = scheme !== 'light'
  const reduced = useReducedMotion()
  // Reduced-motion : la bulle apparaît directement, sans glisser ni grossir.
  const shouldAnimate = animate && !reduced

  const progress = useSharedValue(shouldAnimate ? 0 : 1)
  const translateY = useSharedValue(shouldAnimate ? (isUser ? 20 : 12) : 0)
  const translateX = useSharedValue(shouldAnimate && !isUser ? -8 : 0)
  const scale = useSharedValue(shouldAnimate ? (isUser ? 0.96 : 0.92) : 1)

  useEffect(() => {
    if (!shouldAnimate) return
    const spring = isUser ? SPRING.snappy : SPRING.soft
    progress.value = withTiming(1, { duration: isUser ? 180 : 300 })
    translateY.value = withSpring(0, spring)
    translateX.value = withSpring(0, spring)
    scale.value = withSpring(1, spring)
  }, [])

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }))

  const textStyle = [typo.message as object, { color: isUser ? colors.bubbleUserTx : colors.bubbleAsstTx }]

  if (isUser) {
    return (
      <Animated.View
        accessible
        accessibilityLabel={`Toi : ${message.content}`}
        style={[
          styles.bubble,
          styles.user,
          { backgroundColor: colors.bubbleUser },
          style,
        ]}>
        <Text style={textStyle}>{message.content}</Text>
      </Animated.View>
    )
  }

  // Bulle assistant : papier chaud, gradient diagonal presque invisible — du
  // ton de bulle vers la surface du thème pour donner de la profondeur. Jamais
  // plat. Hairline du thème pour décoller du fond.
  void isDark
  return (
    <Animated.View accessible accessibilityLabel={`Companion : ${message.content}`} style={[styles.assistantWrap, style]}>
      <LinearGradient
        colors={[colors.bubbleAsst, colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubble, styles.assistant, { borderWidth: 1, borderColor: colors.border }]}>
        <Text style={textStyle}>{message.content}</Text>
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  user: {
    alignSelf: 'flex-end',
    marginLeft: 64,
    borderBottomRightRadius: 6,
  },
  assistantWrap: {
    alignSelf: 'flex-start',
    marginRight: 64,
  },
  assistant: {
    borderBottomLeftRadius: 6,
  },
})
