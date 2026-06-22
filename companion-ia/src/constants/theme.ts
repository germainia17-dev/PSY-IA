/**
 * ⚠️ Tokens hérités du template Expo. Source de vérité = `constants/design.ts`
 * (palettes, `type`, `spacing`, `CONFETTI_COLORS`). Ne rien ajouter ici.
 *
 * Ce qui reste est ce qui est encore consommé par quelques composants template :
 * - `Fonts.mono` → `components/themed-text.tsx` (style `code`)
 * - `Spacing`    → `hint-row`, `web-badge`, `ui/collapsible`
 *
 * La palette `Colors` (noir/blanc) a été supprimée : elle n'était plus utilisée
 * et entrait en conflit avec la palette « warm » de design.ts.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// Échelle d'espacement héritée (4/8). Préférer `spacing` de `design.ts` pour
// tout nouveau code ; conservée pour les composants template existants.
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
