import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { palettes } from '../../constants/design';

const p = palettes.light;

export type AvatarProps = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).slice(0, 2);
  const letters = parts.map((w) => w.charAt(0)).join('');
  return letters.toUpperCase().slice(0, 2) || '?';
}

export function Avatar({ name, size = 40, color, style }: AvatarProps) {
  const bg = color ?? p.accentSoft;
  const tx = color ? p.surfaceInverse : p.accentTx;
  const fontSize = Math.round(size * 0.42);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Avatar ${name}`}
    >
      <Text
        style={[
          styles.initials,
          { color: tx, fontSize },
        ]}
        numberOfLines={1}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
});

export default Avatar;
