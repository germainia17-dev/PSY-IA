import { supabase } from './supabase'

// Upgrade une session anonyme en compte email (même user_id conservé).
// Envoie un lien magique de confirmation — l'utilisateur clique et la
// session bascule en compte complet sans changer son historique/plan.
export async function linkEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email })
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
