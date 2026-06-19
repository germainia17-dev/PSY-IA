// Design system Companion — refonte "warm soft v2" (19 juin 2026).
//
// Philosophie : « lampe de chevet / papier crème ». Le compagnon émotionnel
// garde la même âme partout, comme une lumière douce qui ne change pas selon
// l'heure. On impose donc le warm clair quel que soit `useColorScheme`
// (`palettes.dark` === `palettes.light`).
//
// Vocabulaire : compagnon, soutien, écoute, espace personnel — jamais de
// vocabulaire médical (patient, thérapie, dossier clinique).

export type Palette = {
  bg: string
  surface: string
  surfaceHigh: string
  surfaceInverse: string // Blanc pur — élément UI posé sur une surface colorée (knob, scrim inverse)
  accent: string // primary — terracotta
  accentTx: string // texte/icône posé SUR accent
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
  shadow: string // Ombre portée — sert aux élévations (Sheet, knob, carte mise en avant)
}

// Palette "warm soft v2" — crème papier + terracotta. AAA sur le fond crème.
export const warm: Palette = {
  bg: '#FBF1E4',
  surface: '#F4E6D2',
  surfaceHigh: '#EBD5B7',
  surfaceInverse: '#FFFFFF',
  accent: '#C77A4A',
  accentTx: '#1A0A03',
  accentSoft: '#EFC9A8',
  accentGlow: 'rgba(199, 122, 74, 0.18)',
  text: '#2A1207',
  textMuted: '#7A4A2A',
  textFaint: '#9A6D4F',
  border: '#E5CDAE',
  bubbleUser: '#C77A4A',
  bubbleUserTx: '#1A0A03',
  bubbleAsst: '#FFFFFF',
  bubbleAsstTx: '#2A1207',
  error: '#A8331F',
  success: '#3A6B3D',
  shadow: '#1A0A03',
}

// L'app impose le warm — la palette "sombre" est identique à la claire
// pour préserver l'atmosphère "lampe de chevet" en toutes circonstances.
export const palettes: { light: Palette; dark: Palette } = {
  light: warm,
  dark: warm,
}

// ── Thèmes (fonctionnalité Pro) ───────────────────────────────
// Chaque thème garde la même structure de tokens que `warm` (= "cream"), pour
// que tous les écrans changent d'ambiance sans changer de mise en page.

// Nuit douce — lampe de chevet éteinte, fond plum profond, texte crème.
export const nuit: Palette = {
  bg: '#1E1A24',
  surface: '#2A2434',
  surfaceHigh: '#362E44',
  surfaceInverse: '#FFFFFF',
  accent: '#E0A45C',
  accentTx: '#1A1018',
  accentSoft: '#4A3F58',
  accentGlow: 'rgba(224, 164, 92, 0.20)',
  text: '#F2EAF2',
  textMuted: '#B7A9C2',
  textFaint: '#8A7E97',
  border: '#3A3247',
  bubbleUser: '#E0A45C',
  bubbleUserTx: '#1A1018',
  bubbleAsst: '#2A2434',
  bubbleAsstTx: '#F2EAF2',
  error: '#E5736B',
  success: '#7FB585',
  shadow: '#000000',
}

// Forêt — verts profonds et apaisants sur fond sauge clair.
export const foret: Palette = {
  bg: '#EAF1E6',
  surface: '#DCE8D5',
  surfaceHigh: '#C7DBBC',
  surfaceInverse: '#FFFFFF',
  accent: '#4F7A4A',
  accentTx: '#FFFFFF',
  accentSoft: '#B9D3AD',
  accentGlow: 'rgba(79, 122, 74, 0.18)',
  text: '#1E2B1B',
  textMuted: '#45603F',
  textFaint: '#6A8462',
  border: '#CADCC0',
  bubbleUser: '#4F7A4A',
  bubbleUserTx: '#FFFFFF',
  bubbleAsst: '#FFFFFF',
  bubbleAsstTx: '#1E2B1B',
  error: '#A8331F',
  success: '#3A6B3D',
  shadow: '#14210F',
}

// Aurore — dégradés pastel du petit matin, rose poudré.
export const aurore: Palette = {
  bg: '#FBEFF4',
  surface: '#F6E3EC',
  surfaceHigh: '#EFD2E1',
  surfaceInverse: '#FFFFFF',
  accent: '#B85C72',
  accentTx: '#FFFFFF',
  accentSoft: '#E9C2D0',
  accentGlow: 'rgba(184, 92, 114, 0.18)',
  text: '#2A1A22',
  textMuted: '#7A4A5A',
  textFaint: '#9A6D7C',
  border: '#ECD4DF',
  bubbleUser: '#B85C72',
  bubbleUserTx: '#FFFFFF',
  bubbleAsst: '#FFFFFF',
  bubbleAsstTx: '#2A1A22',
  error: '#A8331F',
  success: '#3A6B3D',
  shadow: '#2A0A14',
}

export type ThemeId = 'cream' | 'nuit' | 'foret' | 'aurore'

// Source unique : id de thème → palette. `cream` === `warm` (défaut).
export const themes: Record<ThemeId, Palette> = {
  cream: warm,
  nuit,
  foret,
  aurore,
}

export const DEFAULT_THEME_ID: ThemeId = 'cream'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in themes
}

// ── Couleurs d'accent (fonctionnalité gratuite) ───────────────
// L'accent est la couleur de surbrillance (boutons, bulle utilisateur, sélection).
// Orthogonal au thème : le thème donne le fond/texte, l'accent la couleur vive.
// `tx` = texte/icône posé SUR l'accent (contraste vérifié — tous foncés ici).
export type AccentTokens = {
  accent: string
  accentTx: string
  accentSoft: string
  accentGlow: string
}

export type AccentId = 'terracotta' | 'sauge' | 'lavande' | 'ocre' | 'rose' | 'ardoise'

export const accents: Record<AccentId, AccentTokens> = {
  terracotta: { accent: '#C77A4A', accentTx: '#1A0A03', accentSoft: '#EFC9A8', accentGlow: 'rgba(199, 122, 74, 0.18)' },
  sauge: { accent: '#7C9473', accentTx: '#14210F', accentSoft: '#C7D6BF', accentGlow: 'rgba(124, 148, 115, 0.20)' },
  lavande: { accent: '#9B8AA6', accentTx: '#1E1626', accentSoft: '#D8CFE0', accentGlow: 'rgba(155, 138, 166, 0.20)' },
  ocre: { accent: '#C9A227', accentTx: '#1A1400', accentSoft: '#E8D79A', accentGlow: 'rgba(201, 162, 39, 0.20)' },
  rose: { accent: '#C77A86', accentTx: '#2A0A14', accentSoft: '#E9C2CB', accentGlow: 'rgba(199, 122, 134, 0.20)' },
  ardoise: { accent: '#6E7E8A', accentTx: '#0E1519', accentSoft: '#C5CDD3', accentGlow: 'rgba(110, 126, 138, 0.20)' },
}

export const DEFAULT_ACCENT_ID: AccentId = 'terracotta'

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === 'string' && value in accents
}

// Applique l'accent choisi par-dessus une palette de thème. La bulle
// utilisateur suit l'accent (cohérent avec la palette `warm` d'origine).
export function withAccent(base: Palette, accentId: AccentId): Palette {
  const a = accents[accentId] ?? accents[DEFAULT_ACCENT_ID]
  return {
    ...base,
    accent: a.accent,
    accentTx: a.accentTx,
    accentSoft: a.accentSoft,
    accentGlow: a.accentGlow,
    bubbleUser: a.accent,
    bubbleUserTx: a.accentTx,
  }
}

// Police Inter — cœur visuel. Chaque graisse = un fontFamily dédié
// (convention @expo-google-fonts), donc on ne s'appuie pas sur fontWeight.
export const type = {
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  subtitle: { fontFamily: 'Inter_500Medium', fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  message: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  button: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 20 },
} as const
