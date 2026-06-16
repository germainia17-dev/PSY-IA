import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import { Pressable, Text, useColorScheme } from 'react-native'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter'
import { configureNotifications } from '../lib/notifications'
import { palettes } from '../constants/design'

// Bouton de fermeture des écrans modaux (indispensable sur le web : pas de
// swipe-to-dismiss). Présent à gauche du header de chaque modal.
function ModalClose({ color }: { color: string }) {
  const router = useRouter()
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 22, color, lineHeight: 24 }}>✕</Text>
    </Pressable>
  )
}

export default function RootLayout() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = palettes[isDark ? 'dark' : 'light']

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    configureNotifications()
  }, [])

  // Police Inter = cœur de la DA : on attend son chargement avant le premier
  // rendu — MAIS si elle échoue (ex. 404 d'asset sur le web), on rend quand
  // même avec la police système, sinon l'écran reste blanc indéfiniment.
  if (!fontsLoaded && !fontError) return null

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
      <Stack.Screen name="sessions" options={{ ...sharedModal, title: 'Séances' }} />
    </Stack>
  )
}
