import { Component, useEffect, type ReactNode } from 'react'
import { Stack, useRouter } from 'expo-router'
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import * as Notifications from 'expo-notifications'
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

async function registerPushToken() {
  if (Platform.OS === 'web') return
  try {
    const { granted } = await Notifications.getPermissionsAsync()
    if (!granted) return
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '1e6a4e01-368e-4b5e-b7aa-1c6bc0aa4c2f',
    })
    await supabase
      .from('profiles')
      .update({ push_token: token.data })
      .eq('user_id', session.session.user.id)
  } catch (err) {
    console.error('Failed to register push token:', err)
  }
}

// Filet de sécurité : toute erreur de rendu (ex. config manquante au démarrage)
// affiche le message à l'écran au lieu de fermer l'app sans laisser de trace.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#FBF1E4', padding: 24, justifyContent: 'center' }}>
          <Text style={{ color: '#2A1207', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
            Une erreur est survenue au démarrage
          </Text>
          <ScrollView style={{ maxHeight: 300 }}>
            <Text style={{ color: '#7A4A2A', fontSize: 13 }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </Text>
          </ScrollView>
        </View>
      )
    }
    return this.props.children
  }
}

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
    registerPushToken()

    // Sync des conversations si une session existe au démarrage
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) syncConversations().catch(() => {})
    })

    // Deep link : retour du magic link email (companionia://auth/callback?code=...)
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
    <ErrorBoundary>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </ErrorBoundary>
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
        animationEnabled: true,
        animationDuration: 250,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/callback" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right', gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ ...sharedModal, title: 'Paramètres', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="history" options={{ ...sharedModal, title: 'Conversations', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="memory" options={{ ...sharedModal, title: 'Mémoire', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="journey" options={{ ...sharedModal, title: 'Mon parcours', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="personalization" options={{ ...sharedModal, title: 'Personnalisation', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="sessions" options={{ ...sharedModal, title: 'Séances', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="account" options={{ ...sharedModal, title: 'Mon compte', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="evolution" options={{ ...sharedModal, title: 'Ton évolution', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="policy" options={{ ...sharedModal, title: 'Politique & Confidentialité', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="paywall" options={{ ...sharedModal, title: 'Companion Pro', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="analytics" options={{ ...sharedModal, title: 'Test Analytics', animation: 'slide_from_bottom' }} />
    </Stack>
  )
}
