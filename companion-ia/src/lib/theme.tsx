// Thème actif de l'app, réactif et partagé par tous les écrans.
//
// Historiquement la palette était figée sur `warm`. Désormais l'utilisateur Pro
// peut choisir un thème (dusk/cream/foret/aurore) dans la personnalisation ; ce
// provider charge le choix stocké au démarrage, l'expose à toute l'app, et le
// bascule en direct (sans reload) quand on appelle `setTheme`.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_ACCENT_ID,
  DEFAULT_THEME_ID,
  isAccentId,
  isThemeId,
  themes,
  withAccent,
  type AccentId,
  type Palette,
  type ThemeId,
} from '../constants/design'
import { getPersonalization, pullPersonalization, setPersonalization } from './storage'
import { supabase } from './supabase'

type ThemeContextValue = {
  themeId: ThemeId
  accentId: AccentId
  palette: Palette
  setTheme: (id: ThemeId) => void
  setAccent: (id: AccentId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID)
  const [accentId, setAccentId] = useState<AccentId>(DEFAULT_ACCENT_ID)

  useEffect(() => {
    const apply = (theme: string, accent: string) => {
      if (isThemeId(theme)) setThemeId(theme)
      if (isAccentId(accent)) setAccentId(accent)
    }

    // 1) Local d'abord : bascule visuelle instantanée, sans attendre le réseau.
    getPersonalization().then((p) => apply(p.theme, p.accent)).catch(() => {})

    // 2) Puis le distant (si connecté) : aligne sur le choix fait sur un autre
    //    appareil. Rejoué à chaque login pour couvrir la connexion en cours de session.
    const syncFromRemote = () =>
      pullPersonalization().then((p) => apply(p.theme, p.accent)).catch(() => {})
    syncFromRemote()

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') syncFromRemote()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id) // bascule visuelle immédiate
    setPersonalization({ theme: id }).catch(() => {}) // persiste en arrière-plan
  }, [])

  const setAccent = useCallback((id: AccentId) => {
    setAccentId(id)
    setPersonalization({ accent: id }).catch(() => {})
  }, [])

  // Palette finale = ambiance du thème + couleur d'accent choisie, par-dessus.
  const palette = useMemo(
    () => withAccent(themes[themeId] ?? themes[DEFAULT_THEME_ID], accentId),
    [themeId, accentId],
  )

  return (
    <ThemeContext.Provider value={{ themeId, accentId, palette, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Contrôleur complet (ids + setters) — pour l'écran de personnalisation.
export function useThemeController(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Hors provider (ne devrait pas arriver) : valeurs par défaut inertes.
    return {
      themeId: DEFAULT_THEME_ID,
      accentId: DEFAULT_ACCENT_ID,
      palette: withAccent(themes[DEFAULT_THEME_ID], DEFAULT_ACCENT_ID),
      setTheme: () => {},
      setAccent: () => {},
    }
  }
  return ctx
}

// Palette active seule — ce que consomment tous les écrans/composants.
export function useTheme(): Palette {
  return useContext(ThemeContext)?.palette ?? themes[DEFAULT_THEME_ID]
}
