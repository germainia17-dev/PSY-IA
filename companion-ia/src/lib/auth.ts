import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'

// Termine proprement une session d'auth web laissée ouverte (retour app).
WebBrowser.maybeCompleteAuthSession()

// Auth = magic link email OU « Continuer avec Google » (flux web OAuth).
// L'app marche en session anonyme ; lier un email/Google sert seulement à
// retrouver son historique sur un autre appareil. Cf. positionnement
// « sans compte » : aucune connexion n'est obligatoire.

// Connexion Google par flux web OAuth (PAS le SDK natif).
// On ouvre la page de connexion Google classique dans un onglet sécurisé ;
// Google renvoie sur companionia://auth/callback?code=... que l'on échange
// contre une session — exactement le même mécanisme que le magic link.
// Aucun SHA-1 / client Android requis : Supabase gère le callback web.
export async function signInWithGoogle(): Promise<boolean> {
  const redirectTo = 'companionia://auth/callback'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data.url) throw new Error('URL de connexion Google manquante.')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success' || !result.url) return false

  return handleAuthRedirect(result.url)
}

// Upgrade une session anonyme en compte email (même user_id conservé).
// Envoie un lien magique de confirmation — l'utilisateur clique et la
// session bascule en compte complet sans changer son historique/plan.
export async function linkEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: 'companionia://auth/callback' },
  )
  if (error) throw error
}

// Connexion sur un nouvel appareil pour un compte déjà lié.
// Envoie un magic link ; après clic, handleAuthRedirect() finalise la session.
export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: 'companionia://auth/callback' },
  })
  if (error) throw error
}

// Finalise le magic link après retour de l'email (deep link ou URL web).
// Retourne la session restaurée avec le même user_id que le compte d'origine.
export async function handleAuthRedirect(url: string): Promise<boolean> {
  try {
    // Extrait le fragment ou les query params selon le format du lien
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      url.includes('code=') ? new URL(url).searchParams.get('code') ?? url : url,
    )
    if (error) {
      // Essai alternatif : laisser Supabase parser l'URL complète
      const { error: err2 } = await supabase.auth.setSession({
        access_token: '',
        refresh_token: '',
      })
      void err2
      return false
    }
    return !!data.session
  } catch {
    return false
  }
}

// Retourne l'email lié à la session courante, ou null si compte anonyme.
// IMPORTANT : un user anonyme Supabase a email = "" (chaîne vide), PAS null.
// On utilise `|| null` (et non `?? null`) pour convertir "" en null, sinon
// l'écran compte tombe dans la branche finale `: null` et s'affiche VIDE
// (ni spinner, ni formulaire, ni bouton Google). Bug vérifié 2026-06-22.
export async function getLinkedEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  return email || null
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
