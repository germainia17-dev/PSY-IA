/**
 * Palette active de l'app. Délègue au ThemeProvider (lib/theme) pour que le
 * thème choisi (cream/nuit/foret/aurore) s'applique partout, de façon réactive.
 * Point d'entrée historique conservé : les composants importent `@/hooks/use-theme`.
 */
export { useTheme } from '@/lib/theme';
