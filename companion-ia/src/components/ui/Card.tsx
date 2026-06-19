import React, { useRef, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { palettes } from '../../constants/design';
import { motion } from '../../constants/motion';

const p = palettes.light;

export type CardVariant = 'default' | 'high';

export type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = 'default', onPress, style }: CardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const bg = variant === 'high' ? p.surfaceHigh : p.surface;

  const animateTo = (s: number, o: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: s,
        useNativeDriver: true,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        mass: motion.spring.mass,
      }),
      Animated.timing(opacity, {
        toValue: o,
        duration: motion.durations.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressIn = () => onPress && animateTo(0.98, 0.92);
  const handlePressOut = () => onPress && animateTo(1, 1);
  const handlePress = () => {
    if (!onPress) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  if (onPress) {
    return (
      <Animated.View
        style={[{ transform: [{ scale }], opacity }, style]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.base,
            {
              backgroundColor: bg,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return <View style={[styles.base, { backgroundColor: bg }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palettes.light.border,
  },
});

export default Card;
