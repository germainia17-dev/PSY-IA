import { useState } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { getProUrl } from '../lib/api'
import { usePro } from '../lib/use-pro'
import { Confetti } from '../components/confetti'
import { palettes, type as typo, type Palette } from '../constants/design'

export default function SettingsScreen() {
  const scheme = useColorScheme()
  const colors = palettes[scheme === 'dark' ? 'dark' : 'light']
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)
  const { pro, refresh } = usePro(() => setShowConfetti(true))

  async function openPro() {
    const url = await getProUrl()
    Linking.openURL(url)
    // Au retour de Stripe, on resonde le plan pour basculer l'affichage en Pro.
    let tries = 0
    const poll = async () => {
      tries += 1
      if (await refresh()) return
      if (tries < 12) setTimeout(poll, 5000)
    }
    setTimeout(poll, 5000)
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section label="Ton compagnon" colors={colors}>
          <NavRow
            icon="🧠"
            title="Mémoire"
            subtitle="Ce que Companion retient de toi"
            colors={colors}
            onPress={() => router.push('/memory')}
          />
          <Divider colors={colors} />
          <NavRow
            icon="🗓️"
            title="Séances programmées"
            subtitle="Des rappels doux pour prendre un moment"
            colors={colors}
            onPress={() => router.push('/sessions')}
          />
          <Divider colors={colors} />
          <NavRow
            icon="🕘"
            title="Conversations"
            subtitle="Ton historique d'échanges"
            colors={colors}
            onPress={() => router.push('/history')}
          />
        </Section>

        <Section label="Feedback & Sondages" colors={colors}>
          <NavRow
            icon="📋"
            title="Sondage PSY"
            subtitle="Aide-nous à mieux te comprendre (2-3 min)"
            colors={colors}
            onPress={() => Linking.openURL('https://docs.google.com/forms/d/e/1FAIpQLSdu-Ekw4ySmBmuazz9f6yRvHL2QE__DAbTywFq4nIVGIPALJA/viewform?usp=header')}
          />
        </Section>

        <Section label="Confidentialité" colors={colors}>
          <Text style={[typo.message as object, { color: colors.text }]}>
            Tes conversations restent entre toi et ton compagnon.
          </Text>
          <Text style={[typo.caption as object, { color: colors.textMuted }]}>
            Messages, historique et mémoire sont stockés uniquement sur cet appareil. Le serveur
            relaie ta conversation (chiffrée en transit, HTTPS) vers l'IA pour générer la réponse,
            sans jamais l'enregistrer. Aucun compte, aucun traqueur.
          </Text>
        </Section>

        <Section label="Ton forfait" colors={colors}>
          {pro ? (
            <>
              <View style={styles.row}>
                <Text style={[typo.label as object, { color: colors.text }]}>Companion Pro ✦</Text>
                <Text style={[typo.caption as object, { color: colors.accent }]}>actif</Text>
              </View>
              <Text style={[typo.caption as object, { color: colors.textMuted }]}>
                Conversations illimitées. Merci de soutenir Companion.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={[typo.label as object, { color: colors.text }]}>Gratuit</Text>
                <Text style={[typo.caption as object, { color: colors.textMuted }]}>10 messages / jour</Text>
              </View>
              <TouchableOpacity style={[styles.proBtn, { backgroundColor: colors.accent }]} activeOpacity={0.85} onPress={openPro}>
                <Text style={[typo.button as object, { color: colors.accentTx }]}>Passer à Companion Pro</Text>
              </TouchableOpacity>
              <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center' }]}>
                Conversations illimitées · sans publicité
              </Text>
            </>
          )}
        </Section>

        <Section label="En cas de besoin urgent" colors={colors}>
          <Text style={[typo.caption as object, { color: colors.textMuted }]}>
            Companion est un soutien, pas un service médical. Si tu traverses un moment très
            difficile, le 3114 (gratuit, 24h/24) est là pour toi.
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
      <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
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
}: {
  icon: string
  title: string
  subtitle: string
  colors: Palette
  onPress: () => void
}) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.6 : 1 }]} onPress={onPress}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[typo.label as object, { color: colors.text }]}>{title}</Text>
        <Text style={[typo.caption as object, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <Text style={{ color: colors.textFaint, fontSize: 18 }}>›</Text>
    </Pressable>
  )
}

function Divider({ colors }: { colors: Palette }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 }} />
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginLeft: 4 },
  sectionBody: { borderRadius: 16, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
