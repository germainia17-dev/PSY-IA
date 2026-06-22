import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { palettes } from '../constants/design';

const p = palettes.light;

export type TypingDotsProps = {
  color?: string;
  size?: number;
};

export function TypingDots({ color = p.textMuted, size = 8 }: TypingDotsProps) {
  const reduced = useReducedMotion();
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Reduced-motion : trois points statiques et lisibles, sans pulsation.
    if (reduced) {
      a.setValue(0.7);
      b.setValue(0.7);
      c.setValue(0.7);
      return;
    }
    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    const A = make(a, 0);
    const B = make(b, 200);
    const C = make(c, 400);
    A.start();
    B.start();
    C.start();
    return () => {
      A.stop();
      B.stop();
      C.stop();
    };
  }, [a, b, c, reduced]);

  const dotStyle = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ scale: v }],
  });

  return (
    <View style={styles.row} accessibilityLabel="Le compagnon réfléchit">
      <Animated.View
        style={[
          styles.dot,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          dotStyle(a),
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          styles.gap,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          dotStyle(b),
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          styles.gap,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          dotStyle(c),
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {},
  gap: {
    marginLeft: 6,
  },
});

export default TypingDots;
