// Synchronisation de la personnalisation design (thème/accent/ton) sur le
// backend, pour qu'elle suive l'utilisateur entre appareils et réinstallations.
//
// Ne touche PAS au stockage local (pour éviter un cycle d'import avec storage.ts) :
// `pushPersonalization` écrit le profil distant, `fetchRemotePersonalization` le
// lit. C'est storage.ts qui orchestre le merge local. Le logo reste local : c'est
// un fichier propre à l'appareil (file://), non portable — il faudrait Supabase
// Storage pour le synchroniser (hors périmètre ici).
import { supabase } from './supabase'
import type { Personalization } from './storage'

// Sous-ensemble synchronisé (pas de logo).
export type RemotePersonalization = Pick<Personalization, 'accent' | 'theme' | 'tone'>

// Best-effort : la synchro est un bonus, jamais bloquante ni fatale.
export async function pushPersonalization(p: Personalization): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').upsert(
      {
        user_id: session.user.id,
        personalization: { accent: p.accent, theme: p.theme, tone: p.tone },
      },
      { onConflict: 'user_id' },
    )
  } catch {
    // réseau/RLS : on ignore, le local reste la source de vérité immédiate
  }
}

export async function fetchRemotePersonalization(): Promise<RemotePersonalization | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const { data } = await supabase
      .from('profiles')
      .select('personalization')
      .eq('user_id', session.user.id)
      .maybeSingle()
    const p = data?.personalization as Partial<RemotePersonalization> | null | undefined
    if (!p) return null
    return {
      accent: p.accent ?? '',
      theme: p.theme ?? '',
      tone: p.tone ?? '',
    }
  } catch {
    return null
  }
}
