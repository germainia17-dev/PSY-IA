import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { palettes } from '../../constants/design';
import { type } from '../../constants/type';

const p = palettes.light;

export type BadgeVariant = 'accent' | 'success' | 'error' | 'neutral';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function colors(v: BadgeVariant) {
  switch (v) {
    case 'accent':
      return { bg: p.accentSoft, tx: p.accentTx };
    case 'success':
      return { bg: 'rgba(58, 107, 61, 0.18)', tx: p.success };
    case 'error':
      return { bg: 'rgba(168, 51, 31, 0.16)', tx: p.error };
    case 'neutral':
      return { bg: p.surfaceHigh, tx: p.textMuted };
  }
}

export function Badge({ label, variant = 'neutral', icon, style }: BadgeProps) {
  const c = colors(variant);
  return (
    <View style={[styles.base, { backgroundColor: c.bg }, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[type.caption, styles.label, { color: c.tx, fontFamily: 'Inter_500Medium', fontSize: 12 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    lineHeight: 16,
  },
});

export default Badge;
