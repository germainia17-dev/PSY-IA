import { useEffect } from 'react'
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { handleAuthRedirect } from '../../lib/auth'
import { pullConversations, syncConversations } from '../../lib/sync'
import { useTheme } from '../../lib/theme'
import { type as typo } from '../../constants/type'

// Route cible du magic link / changement d'email (companionia://auth/callback?code=…).
// Son existence empêche l'écran « Unmatched Route » d'Expo Router : c'est ici que
// le code est échangé contre une session, puis on revient à l'accueil.
export default function AuthCallback() {
  const router = useRouter()
  const colors = useTheme()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const url = await Linking.getInitialURL()
        if (url) {
          const ok = await handleAuthRedirect(url)
          if (ok) {
            await pullConversations().catch(() => {})
            await syncConversations().catch(() => {})
          }
        }
      } finally {
        if (!cancelled) router.replace('/')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 16 }]}>
        Connexion en cours…
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
