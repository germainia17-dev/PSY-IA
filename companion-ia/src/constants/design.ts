// Design system Companion — refonte minimale (12 juin 2026).
// Inspiré du « minimal-design-system » (shadcn-style) : monochrome near-black /
// near-white, échelle de gris neutre, boutons inversés (primary), police Inter,
// espacement généreux. Dark mode prioritaire (usage le soir).

export type Palette = {
  bg: string
  surface: string
  surfaceHigh: string
  accent: string // primary — quasi-blanc en dark, quasi-noir en light
  accentTx: string // texte/icône posé SUR accent (inversé)
  accentSoft: string
  accentGlow: string
  text: string
  textMuted: string
  textFaint: string
  border: string
  bubbleUser: string
  bubbleUserTx: string
  bubbleAsst: string
  bubbleAsstTx: string
  error: string
  success: string
}

// Échelle neutre type zinc (hue 240, quasi-désaturée) pour coller aux tokens
// HSL de la skill (background 240 10% 3.9%, foreground 0 0% 98%, etc.).
export const palettes: { dark: Palette; light: Palette } = {
  dark: {
    bg: '#09090B', // zinc-950
    surface: '#18181B', // zinc-900 (cartes)
    surfaceHigh: '#27272A', // zinc-800 (champs, états)
    accent: '#FAFAFA', // primary inversé : bouton clair sur fond sombre
    accentTx: '#09090B', // texte sombre sur bouton clair
    accentSoft: '#E4E4E7', // zinc-200
    accentGlow: 'rgba(250,250,250,0.10)',
    text: '#FAFAFA', // zinc-50
    textMuted: '#A1A1AA', // zinc-400
    textFaint: '#52525B', // zinc-600
    border: '#27272A', // zinc-800
    bubbleUser: '#FAFAFA', // user = primary (clair, inversé)
    bubbleUserTx: '#09090B',
    bubbleAsst: '#1C1C20', // carte légèrement relevée
    bubbleAsstTx: '#FAFAFA',
    error: '#F87171', // red-400, status discret
    success: '#34D399', // emerald-400
  },
  light: {
    bg: '#FFFFFF',
    surface: '#FAFAFA', // zinc-50
    surfaceHigh: '#F4F4F5', // zinc-100
    accent: '#18181B', // primary : bouton sombre sur fond clair
    accentTx: '#FAFAFA', // texte clair sur bouton sombre
    accentSoft: '#3F3F46', // zinc-700
    accentGlow: 'rgba(0,0,0,0.05)',
    text: '#09090B', // zinc-950
    textMuted: '#71717A', // zinc-500
    textFaint: '#A1A1AA', // zinc-400
    border: '#E4E4E7', // zinc-200
    bubbleUser: '#18181B', // user = primary (sombre)
    bubbleUserTx: '#FAFAFA',
    bubbleAsst: '#F4F4F5', // zinc-100
    bubbleAsstTx: '#18181B',
    error: '#DC2626', // red-600
    success: '#059669', // emerald-600
  },
}

// Police Inter — cœur visuel de la skill. Chaque graisse = un fontFamily
// dédié (convention @expo-google-fonts), donc on ne s'appuie pas sur fontWeight.
export const type = {
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  subtitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  message: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 17 },
  button: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 20, letterSpacing: -0.1 },
} as const
