import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import { Linking, Platform, Pressable, Text } from 'react-native'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter'
import { configureNotifications } from '../lib/notifications'
import { handleAuthRedirect } from '../lib/auth'
import { pullConversations, syncConversations } from '../lib/sync'
import { supabase } from '../lib/supabase'
import { ThemeProvider, useTheme } from '../lib/theme'

// Bouton de fermeture des écrans modaux (indispensable sur le web : pas de
// swipe-to-dismiss). Présent à gauche du header de chaque modal.
function ModalClose({ color }: { color: string }) {
  const router = useRouter()
  // router.back() est un no-op quand la pile est vide (arrivée directe sur une
  // URL en web, ou après un replace). On retombe alors sur l'accueil.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  return (
    <Pressable onPress={close} hitSlop={12} style={{ paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 22, color, lineHeight: 24 }}>✕</Text>
    </Pressable>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    configureNotifications()

    // Sync des conversations si une session existe au démarrage
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) syncConversations().catch(() => {})
    })

    // Deep link : retour du magic link email (companion://auth/callback?code=...)
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url.includes('auth/callback')) return
      const ok = await handleAuthRedirect(url)
      if (ok) {
        await pullConversations()
        await syncConversations()
      }
    }

    // URL initiale (app ouverte via le lien depuis un état fermé)
    if (Platform.OS !== 'web') {
      Linking.getInitialURL().then((url) => { if (url) handleUrl({ url }) })
    }

    const sub = Linking.addEventListener('url', handleUrl)
    return () => sub.remove()
  }, [])

  // Police Inter = cœur de la DA : on attend son chargement avant le premier
  // rendu — MAIS si elle échoue (ex. 404 d'asset sur le web), on rend quand
  // même avec la police système, sinon l'écran reste blanc indéfiniment.
  if (!fontsLoaded && !fontError) return null

  // Le provider de thème enveloppe toute la navigation : la palette active
  // (cream/nuit/foret/aurore) est ainsi disponible dans chaque écran et header.
  return (
    <ThemeProvider>
      <RootStack />
    </ThemeProvider>
  )
}

function RootStack() {
  const colors = useTheme()

  const sharedModal = {
    presentation: 'modal' as const,
    headerShown: true,
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
    headerBackTitle: 'Chat',
    headerLeft: () => <ModalClose color={colors.text} />,
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ ...sharedModal, title: 'Paramètres' }} />
      <Stack.Screen name="history" options={{ ...sharedModal, title: 'Conversations' }} />
      <Stack.Screen name="memory" options={{ ...sharedModal, title: 'Mémoire' }} />
      <Stack.Screen name="journey" options={{ ...sharedModal, title: 'Mon parcours' }} />
      <Stack.Screen name="personalization" options={{ ...sharedModal, title: 'Personnalisation' }} />
      <Stack.Screen name="sessions" options={{ ...sharedModal, title: 'Séances' }} />
      <Stack.Screen name="account" options={{ ...sharedModal, title: 'Mon compte' }} />
      <Stack.Screen name="evolution" options={{ ...sharedModal, title: 'Ton évolution' }} />
      <Stack.Screen name="paywall" options={{ ...sharedModal, title: 'Companion Pro' }} />
    </Stack>
  )
}
