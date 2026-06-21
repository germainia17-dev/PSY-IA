import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Garde-fou : si les variables EXPO_PUBLIC ne sont pas inlinées au build (ex.
// `.env` non uploadé à EAS et aucun bloc `env` dans eas.json), createClient
// throw un message cryptique et l'app crashe au lancement. On lève une erreur
// explicite pour rendre la cause immédiatement lisible.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Config Supabase manquante : EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY absentes du build.',
  )
}

// Persistance de session obligatoire : sinon chaque lancement crée un
// nouvel utilisateur anonyme (quota journalier contourné, base polluée).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})
