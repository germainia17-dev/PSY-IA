import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme';
import { type Palette } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: keyof Palette;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: type === 'linkPrimary' ? theme.accent : (theme[themeColor ?? 'text'] as string) },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_500Medium',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_700Bold',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter_500Medium',
  },
  title: {
    fontSize: 48,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontFamily: 'Inter_600SemiBold',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
