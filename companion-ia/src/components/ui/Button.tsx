import React, { useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { palettes } from '../../constants/design';
import { type } from '../../constants/type';
import { motion } from '../../constants/motion';

const p = palettes.light;

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  variant?: ButtonVariant;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const SIZE_PADDING: Record<ButtonSize, { v: number; h: number; font: number }> = {
  sm: { v: 8, h: 14, font: 14 },
  md: { v: 14, h: 22, font: 16 },
  lg: { v: 18, h: 28, font: 17 },
};

function variantColors(v: ButtonVariant) {
  switch (v) {
    case 'primary':
      return { bg: p.accent, tx: p.accentTx, border: 'transparent' as const };
    case 'secondary':
      return { bg: p.surface, tx: p.text, border: p.border };
    case 'ghost':
      return { bg: 'transparent' as const, tx: p.text, border: 'transparent' as const };
    case 'destructive':
      return { bg: p.error, tx: p.surfaceInverse, border: 'transparent' as const };
  }
}

export function Button({
  variant = 'primary',
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  size = 'md',
  style,
  accessibilityLabel,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const c = variantColors(variant);
  const pad = SIZE_PADDING[size];

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

  const handlePressIn = () => {
    if (disabled || loading) return;
    animateTo(0.97, 0.85);
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    animateTo(1, 1);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          opacity: disabled ? 0.5 : opacity,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: c.bg,
            borderColor: c.border,
            paddingVertical: pad.v,
            paddingHorizontal: pad.h,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        {loading ? (
          <LoadingDots color={c.tx} />
        ) : (
          <View style={styles.row}>
            {icon ? <View style={styles.iconLeft}>{icon}</View> : null}
            <Text
              style={[
                styles.label,
                type.button,
                { color: c.tx, fontSize: pad.font, lineHeight: pad.font + 4 },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function LoadingDots({ color }: { color: string }) {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c2 = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 360, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 360, useNativeDriver: true }),
        ]),
      );
    const A = make(a, 0);
    const B = make(b, 200);
    const C = make(c2, 400);
    A.start();
    B.start();
    C.start();
    return () => {
      A.stop();
      B.stop();
      C.stop();
    };
  }, [a, b, c2]);

  const dot = (v: Animated.Value) => ({ opacity: v, transform: [{ scale: v }] });

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot(a)]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot(b)]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot(c2)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  label: {
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
});

export default Button;

// Silence unused-import warning for ActivityIndicator (kept for future use).
void ActivityIndicator;
