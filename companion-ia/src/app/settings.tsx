import { useEffect, useState } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { cancelSubscription, summarizeSession } from '../lib/api'
import { loadCurrentOrNew, saveSessionSummary } from '../lib/storage'
import { sendTestReengagementNow } from '../lib/notifications'
import { getLinkedEmail } from '../lib/auth'
import { usePro } from '../lib/use-pro'
import { Confetti } from '../components/confetti'
import { type as typo, type Palette } from '../constants/type'
import { useTheme } from '../hooks/use-theme'
import { EXTERNAL_URLS } from '../constants/urls'
import { confirm, notify } from '../lib/confirm'

export default function SettingsScreen() {
  const colors = useTheme()
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null)
  const { pro, refresh } = usePro(() => setShowConfetti(true))

  useEffect(() => {
    getLinkedEmail().then(setLinkedEmail).catch(() => {})
  }, [])

  // DEBUG (dev only) : force le résumé de la séance courante puis envoie la
  // relance personnalisée dans 3s. Permet de valider la feature sans attendre 20h.
  async function runDebugSummary() {
    try {
      const convo = await loadCurrentOrNew()
      const { summary, themes } = await summarizeSession(convo.messages)
      await saveSessionSummary(convo.id, summary, themes)
      const body = await sendTestReengagementNow()
      notify(
        'Résumé de séance',
        `Résumé : ${summary || '(vide)'}\n\nThèmes : ${themes.join(', ') || '(aucun)'}\n\nRelance (dans 3s) : ${body}`,
      )
    } catch (err) {
      notify('Debug', `Échec : ${String(err)}`)
    }
  }

  function confirmCancel() {
    confirm({
      title: 'Annuler Companion Pro ?',
      message: 'Tu repasseras à 10 messages par jour. Cette action est immédiate et irréversible.',
      confirmLabel: 'Oui, annuler',
      cancelLabel: 'Non, garder Pro',
      destructive: true,
      onConfirm: async () => {
        try {
          await cancelSubscription()
          await refresh()
        } catch {
          notify('Erreur', "Impossible d'annuler. Contacte le support.")
        }
      },
    })
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Profile card */}
        <Pressable
          style={({ pressed }) => [styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
          onPress={() => router.push('/account')}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.profileInitial, { color: colors.accentTx }]}>
              {linkedEmail ? linkedEmail[0].toUpperCase() : '✦'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typo.label as object, { color: colors.text }]}>
              {linkedEmail ?? 'Sans compte'}
            </Text>
            <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 1 }]}>
              {linkedEmail ? 'Compte lié · sauvegarde active' : 'Anonyme · sauvegarde ton compte →'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>

        <Section label="Ton compagnon" colors={colors}>
          <NavRow
            icon="compass-outline"
            title="Mon parcours"
            subtitle="Ta série de présence et ton humeur"
            colors={colors}
            onPress={() => router.push('/journey')}
          />
          <NavRow
            icon="color-palette-outline"
            title="Personnalisation"
            subtitle="Logo, couleurs · thèmes & ton ✦ Pro"
            colors={colors}
            onPress={() => router.push('/personalization')}
          />
          <NavRow
            icon="library-outline"
            title="Mémoire"
            subtitle="Ce que Companion retient de toi"
            colors={colors}
            onPress={() => router.push('/memory')}
          />
          <NavRow
            icon="calendar-outline"
            title="Séances programmées"
            subtitle="Des rappels doux pour prendre un moment"
            colors={colors}
            onPress={() => router.push('/sessions')}
          />
          <NavRow
            icon="chatbubbles-outline"
            title="Conversations"
            subtitle="Ton historique d'échanges"
            colors={colors}
            onPress={() => router.push('/history')}
            last
          />
        </Section>

        {/* Pro CTA or Pro status */}
        {pro ? (
          <Section label="Ton forfait" colors={colors}>
            <View style={styles.row}>
              <Text style={[typo.label as object, { color: colors.text }]}>Companion Pro ✦</Text>
              <Text style={[typo.caption as object, { color: colors.accent }]}>actif</Text>
            </View>
            <Text style={[typo.caption as object, { color: colors.textMuted }]}>
              Conversations illimitées. Merci de soutenir Companion.
            </Text>
            <TouchableOpacity onPress={confirmCancel} hitSlop={8}>
              <Text style={[typo.caption as object, { color: colors.textMuted, textDecorationLine: 'underline' }]}>
                Annuler mon abonnement
              </Text>
            </TouchableOpacity>
          </Section>
        ) : (
          <Pressable onPress={() => router.push('/paywall')} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            <LinearGradient
              colors={[colors.accent, '#8B4A1E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.proCta}>
              <View style={[styles.proCtaIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Ionicons name="diamond-outline" size={22} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proCtaTitle}>Passe à Companion Pro</Text>
                <Text style={styles.proCtaSub}>Conversations illimitées · personnalisation</Text>
              </View>
              <Text style={styles.proCtaChevron}>›</Text>
            </LinearGradient>
          </Pressable>
        )}

        <Section label="Support" colors={colors}>
          <NavRow
            icon="star-outline"
            title="Sondage PSY"
            subtitle="Aide-nous à mieux te comprendre (2-3 min)"
            colors={colors}
            onPress={() => Linking.openURL(EXTERNAL_URLS.psySurvey)}
          />
          <NavRow
            icon="shield-checkmark-outline"
            title="Politique & Confidentialité"
            subtitle="Conditions d'utilisation et données"
            colors={colors}
            onPress={() => router.push('/policy')}
            last
          />
        </Section>

        {__DEV__ ? (
          <Section label="Debug (dev)" colors={colors}>
            <TouchableOpacity onPress={runDebugSummary} hitSlop={8}>
              <Text style={[typo.label as object, { color: colors.accent }]}>
                Tester résumé + relance
              </Text>
              <Text style={[typo.caption as object, { color: colors.textMuted }]}>
                Résume la séance courante et envoie la notif personnalisée dans 3s
              </Text>
            </TouchableOpacity>
          </Section>
        ) : null}

        <Section label="En cas de besoin urgent" colors={colors}>
          <Text style={[typo.caption as object, { color: colors.textMuted, lineHeight: 18 }]}>
            Companion est un soutien, pas un service médical. Si tu traverses un moment très
            difficile, le{' '}
            <Text style={{ color: colors.error, fontFamily: 'Inter_600SemiBold' }}>3114</Text>
            {' '}(gratuit, 24h/24) est là pour toi.
          </Text>
        </Section>

      </ScrollView>

      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
    </SafeAreaView>
  )
}

function Section({ label, children, colors }: { label: string; children: React.ReactNode; colors: Palette }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        <View style={[styles.sectionDot, { backgroundColor: colors.accent }]} />
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
      </View>
      <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  )
}

function NavRow({
  icon,
  title,
  subtitle,
  colors,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle: string
  colors: Palette
  onPress: () => void
  last?: boolean
}) {
  return (
    <>
      <Pressable style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.6 : 1 }]} onPress={onPress}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={icon} size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typo.label as object, { color: colors.text }]}>{title}</Text>
          <Text style={[typo.caption as object, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
      </Pressable>
      {!last && <View style={[styles.separator, { backgroundColor: colors.border, marginLeft: 62 }]} />}
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1A0A03',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { fontSize: 18, fontFamily: 'Inter_700Bold' },

  section: { gap: 8 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 },
  sectionDot: { width: 5, height: 5, borderRadius: 3 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  sectionBody: {
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1A0A03',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 17 },
  separator: { height: StyleSheet.hairlineWidth },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  proCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#C77A4A',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  proCtaIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  proCtaTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white', letterSpacing: -0.1 },
  proCtaSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  proCtaChevron: { color: 'rgba(255,255,255,0.8)', fontSize: 20 },
})
