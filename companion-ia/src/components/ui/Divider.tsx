import React from 'react';
import { StyleSheet, View } from 'react-native';
import { palettes } from '../../constants/design';

const p = palettes.light;

export type DividerProps = {
  marginVertical?: number;
  color?: string;
};

export function Divider({ marginVertical = 12, color }: DividerProps) {
  return (
    <View
      style={[
        styles.line,
        { marginVertical, backgroundColor: color ?? p.border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth * 2,
    width: '100%',
  },
});

export default Divider;
