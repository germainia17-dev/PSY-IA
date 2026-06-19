import { useRef, useState } from 'react'
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getProUrl, PRO_OFFERS, type PlanInterval } from '../lib/api'
import { usePro } from '../lib/use-pro'
import { Confetti } from '../components/confetti'
import { Orb } from '../components/orb'
import { type as typo } from '../constants/type'
import { useTheme } from '../hooks/use-theme'

const FEATURES = [
  'Conversations illimitées chaque jour',
  'Thèmes visuels exclusifs (Nuit, Forêt, Aurore)',
  'Ton de réponse personnalisé',
  'Logo personnalisé dans l\'interface',
]

export default function PaywallScreen() {
  const colors = useTheme()
  const [showConfetti, setShowConfetti] = useState(false)
  const proPoll = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { refresh } = usePro(() => setShowConfetti(true))

  async function openPro(interval: PlanInterval) {
    const url = await getProUrl(interval)
    Linking.openURL(url)
    if (proPoll.current) clearTimeout(proPoll.current)
    let tries = 0
    const poll = async () => {
      tries += 1
      if (await refresh()) return
      if (tries < 12) proPoll.current = setTimeout(poll, 5000)
    }
    setTimeout(poll, 5000)
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient
          colors={['#C77A4A', '#8B3A12', '#5C2008']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.hero}>
          <Orb state="idle" size={72} />
          <Text style={styles.heroTitle}>Companion Pro</Text>
          <Text style={styles.heroSub}>Ton compagnon sans limites,{'\n'}disponible partout et toujours.</Text>
        </LinearGradient>

        {/* Feature list */}
        <View style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureItem, i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[styles.featureCheck, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.featureCheckText, { color: colors.accent }]}>✓</Text>
              </View>
              <Text style={[typo.label as object, { color: colors.text, flex: 1 }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Pricing cards */}
        <View style={styles.cards}>
          {PRO_OFFERS.map((offer) => (
            <TouchableOpacity
              key={offer.interval}
              activeOpacity={0.85}
              onPress={() => openPro(offer.interval)}
              style={[
                styles.card,
                { backgroundColor: offer.highlight ? 'white' : colors.surface, borderColor: offer.highlight ? colors.accent : colors.border },
                offer.highlight && styles.cardHighlight,
              ]}>
              {offer.sublabel ? (
                <View style={[
                  styles.badge,
                  { backgroundColor: offer.highlight ? colors.accent : colors.surface, borderColor: colors.border },
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { color: offer.highlight ? colors.accentTx : colors.textMuted },
                  ]}>
                    {offer.sublabel}
                  </Text>
                </View>
              ) : (
                <View style={styles.badgePlaceholder} />
              )}

              <Text style={[typo.label as object, { color: colors.text, marginTop: 8 }]}>
                {offer.label}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: offer.highlight ? colors.accent : colors.text }]}>
                  {offer.price}
                </Text>
                <Text style={[typo.caption as object, { color: colors.textMuted }]}>
                  {offer.period}
                </Text>
              </View>

              {offer.highlight ? (
                <LinearGradient
                  colors={[colors.accent, '#8B4A1E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}>
                  <Text style={[typo.button as object, { color: 'white' }]}>Choisir</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.btn, { backgroundColor: colors.surfaceHigh }]}>
                  <Text style={[typo.button as object, { color: colors.text }]}>Choisir</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[typo.caption as object, { color: colors.textFaint, textAlign: 'center', marginTop: 8 }]}>
          Annulable à tout moment · Paiement sécurisé Stripe
        </Text>
      </ScrollView>

      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },

  hero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 20,
    gap: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: 'white',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 21,
  },

  featureCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1A0A03',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  featureCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheckText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  cards: { gap: 10, marginHorizontal: 16, marginTop: 20 },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 4,
  },
  cardHighlight: {
    shadowColor: '#C77A4A',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgePlaceholder: { height: 22 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  price: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  btnGradient: {
    marginTop: 12,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    marginTop: 12,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
