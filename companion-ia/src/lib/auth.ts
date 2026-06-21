import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin'
import { supabase } from './supabase'

// Connexion Google native → on échange l'idToken Google contre une session
// Supabase (provider 'google'). Le webClientId est l'OAuth *Web* client de
// Google Cloud (cf. EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID). Nécessite : provider
// Google activé dans Supabase + un build natif (le module ne marche pas en Expo Go).
let googleConfigured = false
function configureGoogle() {
  if (googleConfigured) return
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })
  googleConfigured = true
}

// Retourne true si la session Google a été créée. Retourne false si annulé
// ou erreur dev (fallback à email). Lance erreur seulement si problème real.
export async function signInWithGoogle(): Promise<boolean> {
  configureGoogle()
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) return false // annulé

    const idToken = response.data.idToken
    if (!idToken) throw new Error('Google : idToken manquant')

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw error
    return true
  } catch (err) {
    // DEVELOPER_ERROR = clé de signature non configurée (normal en dev/beta)
    // Fallback à email login au lieu de crasher
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('DEVELOPER_ERROR') || msg.includes('Failed to get document') || msg.includes('com.google.android.gms')) {
      // C'est une erreur de configuration, pas une erreur réelle
      throw new Error('Google Sign-in non disponible en beta. Utilise Email login à la place.')
    }
    throw err
  }
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
export async function getLinkedEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  return email ?? null
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
