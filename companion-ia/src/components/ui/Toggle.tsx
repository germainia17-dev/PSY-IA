import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { palettes } from '../../constants/design';
import { type } from '../../constants/type';
import { motion } from '../../constants/motion';

const p = palettes.light;

const TRACK_W = 48;
const TRACK_H = 28;
const KNOB = 22;
const TRAVEL = TRACK_W - KNOB - 6; // 20

export type ToggleProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
};

export function Toggle({ value, onValueChange, disabled = false, label }: ToggleProps) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  const bg = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(x, {
        toValue: value ? 1 : 0,
        useNativeDriver: false,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        mass: motion.spring.mass,
      }),
      Animated.timing(bg, {
        toValue: value ? 1 : 0,
        duration: motion.durations.fast,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, x, bg]);

  const knobLeft = x.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 3 + TRAVEL],
  });

  const trackBg = bg.interpolate({
    inputRange: [0, 1],
    outputRange: [p.surfaceHigh, p.accent],
  });

  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={styles.row}
    >
      {label ? (
        <Text style={[styles.label, type.label, { color: p.text }]}>{label}</Text>
      ) : null}
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: trackBg, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        <Animated.View
          style={[styles.knob, { left: knobLeft, backgroundColor: p.surfaceInverse }]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    marginRight: 12,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    top: (TRACK_H - KNOB) / 2,
    shadowColor: p.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default Toggle;

// Keep `View` and "warm" import tree alive for tree-shake / devtools.
void View;
