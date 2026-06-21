import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { getLinkedEmail, linkEmail, signInWithEmail, signInWithGoogle, signOut } from '../lib/auth'
import { confirm, notify } from '../lib/confirm'
import { pullConversations, syncConversations } from '../lib/sync'
import { supabase } from '../lib/supabase'
import { type as typo } from '../constants/type'
import { useTheme } from '../hooks/use-theme'

// Calcule la date du 3e jeudi du mois courant/suivant
function nextThirdThursday(): Date {
  const now = new Date()
  let date = new Date(now.getFullYear(), now.getMonth(), 1)

  // Compte les jeudis (0=dim, 4=jeu)
  let thursdays = 0
  while (thursdays < 3) {
    if (date.getDay() === 4) thursdays++
    if (thursdays < 3) date.setDate(date.getDate() + 1)
  }

  // Si cette date est dépassée, prendre le 3e jeudi du mois suivant
  if (date < now) {
    date = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    thursdays = 0
    while (thursdays < 3) {
      if (date.getDay() === 4) thursdays++
      if (thursdays < 3) date.setDate(date.getDate() + 1)
    }
  }

  return date
}

export default function AccountScreen() {
  const colors = useTheme()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [linkedEmail, setLinkedEmail] = useState<string | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    getLinkedEmail().then(setLinkedEmail).catch(() => setLinkedEmail(null))

    // Écoute USER_UPDATED : email confirmé → on refresh l'affichage
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED') {
        getLinkedEmail().then(setLinkedEmail).catch(() => {})
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLink() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      notify('Email invalide', 'Saisis un email valide.')
      return
    }
    setLoading(true)
    try {
      await linkEmail(trimmed)
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      notify('Erreur', msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    try {
      const ok = await signInWithGoogle()
      if (!ok) return // annulé
      await pullConversations().catch(() => {})
      await syncConversations().catch(() => {})
      const linked = await getLinkedEmail().catch(() => null)
      setLinkedEmail(linked)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connexion Google impossible'
      notify('Erreur', msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      notify('Email invalide', 'Saisis un email valide.')
      return
    }
    setLoading(true)
    try {
      await signInWithEmail(trimmed)
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      notify('Erreur', msg)
    } finally {
      setLoading(false)
    }
  }

  function handleSignOut() {
    confirm({
      title: 'Se déconnecter',
      message: 'Tes conversations locales resteront sur cet appareil.',
      confirmLabel: 'Se déconnecter',
      destructive: true,
      onConfirm: async () => {
        await signOut()
        if (router.canGoBack()) router.back()
        else router.replace('/')
      },
    })
  }

  if (linkedEmail === undefined) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {linkedEmail ? (
            // — Compte lié —
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typo.label as object, { color: colors.text }]}>Compte actif</Text>
              <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 4 }]}>
                {linkedEmail}
              </Text>
              <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 12 }]}>
                Tes conversations sont synchronisées sur tous tes appareils. Pour retrouver ton
                compte sur un nouvel appareil, utilise le lien magique envoyé à cet email.
              </Text>
              <TouchableOpacity
                style={[styles.btn, styles.btnDestructive]}
                onPress={handleSignOut}
                activeOpacity={0.8}>
                <Text style={[typo.button as object, { color: '#fff' }]}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          ) : sent ? (
            // — Email envoyé —
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typo.label as object, { color: colors.text }]}>Vérifie ta boîte mail</Text>
              <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 8 }]}>
                Un lien magique a été envoyé à {email.trim()}. Clique dessus pour activer ton compte.
              </Text>
              <TouchableOpacity onPress={() => setSent(false)} hitSlop={8} style={{ marginTop: 16 }}>
                <Text style={[typo.caption as object, { color: colors.accent }]}>
                  Utiliser un autre email
                </Text>
              </TouchableOpacity>
            </View>
          ) : linkedEmail === null ? (
            // — Concours + Compte —
            <>
              <View style={[styles.card, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                <Text style={[typo.label as object, { color: colors.accent }]}>🎁 Concours Mensuel</Text>
                <Text style={[typo.caption as object, { color: colors.accentTx, marginTop: 8 }]}>
                  Tirage: {nextThirdThursday().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <Text style={[typo.caption as object, { color: colors.accentTx, marginTop: 6, opacity: 0.8 }]}>
                  Parraine un ami pour +1 chance de gagner.
                </Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[typo.label as object, { color: colors.text }]}>Sauvegarder ton compte</Text>
                <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 8 }]}>
                  Lie un email pour retrouver tes conversations et ton abonnement sur n'importe quel
                  appareil. Un simple lien magique — aucun mot de passe.
                </Text>

                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ton@email.com"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.accent }]}
                  onPress={handleLink}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading
                    ? <ActivityIndicator color={colors.accentTx} />
                    : <Text style={[typo.button as object, { color: colors.accentTx }]}>Lier mon email</Text>
                  }
                </TouchableOpacity>
              </View>

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[typo.label as object, { color: colors.text }]}>Déjà un compte ?</Text>
                <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 8 }]}>
                  Si tu as déjà lié un email sur un autre appareil, saisis-le ici pour recevoir
                  un lien de connexion.
                </Text>

                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ton@email.com"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}
                  onPress={handleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading
                    ? <ActivityIndicator color={colors.accent} />
                    : <Text style={[typo.button as object, { color: colors.text }]}>Recevoir un lien de connexion</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // — Compte lié + Google option —
            <>
              {Platform.OS !== 'web' && (
                <>
                  <TouchableOpacity
                    style={[styles.btn, styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={handleGoogle}
                    disabled={loading}
                    activeOpacity={0.85}>
                    {loading
                      ? <ActivityIndicator color={colors.accent} />
                      : <Text style={[typo.button as object, { color: colors.text }]}>Lier Google aussi</Text>
                    }
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth },
  input: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  btn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDestructive: { backgroundColor: '#A8331F', marginTop: 16 },
  googleBtn: { borderWidth: StyleSheet.hairlineWidth, marginTop: 0 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
})
