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
import { logEvent } from '../lib/events'

// Bénéfices (côté utilisateur), pas une liste de features. Uniquement ce qui est
// réellement réservé au Pro : messages illimités, ton, thèmes décoratifs, parcours.
// (Le logo et le mode Nuit sont gratuits — ne pas les vendre ici.)
const FEATURES = [
  'Parle autant que tu veux — aucune limite quotidienne',
  'Le ton qui t\'apaise : doux, direct, motivant ou posé',
  'Ambiances visuelles Forêt et Aurore',
  'Retrace ton parcours : ton humeur au fil des semaines',
]

export default function PaywallScreen() {
  const colors = useTheme()
  const [showConfetti, setShowConfetti] = useState(false)
  const proPoll = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { refresh } = usePro(() => {
    setShowConfetti(true)
    logEvent('pro_purchased')
  })

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
          colors={[...colors.gradientHero]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.hero}>
          <Orb state="idle" size={72} />
          <Text style={styles.heroTitle}>Companion Pro</Text>
          <Text style={styles.heroSub}>Ton compagnon sans limites,{'\n'}disponible partout et toujours.</Text>
        </LinearGradient>

        {/* Feature list */}
        <View style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureItem, i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[styles.featureCheck, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.featureCheckText, { color: colors.accent }]}>✓</Text>
              </View>
              <Text style={[typo.label as object, { color: colors.text, flex: 1 }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Réassurance honnête : le différenciateur réel, c'est la vie privée.
            TODO preuve sociale — insérer ici de VRAIS témoignages / une note
            moyenne quand on en aura. Ne jamais inventer de chiffres. */}
        <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center', marginHorizontal: 24, marginTop: 16, lineHeight: 18 }]}>
          Sans compte. Tes conversations restent privées, sur ton téléphone.
        </Text>

        {/* Pricing cards */}
        <View style={styles.cards}>
          {PRO_OFFERS.map((offer) => (
            <TouchableOpacity
              key={offer.interval}
              activeOpacity={0.85}
              onPress={() => openPro(offer.interval)}
              accessibilityRole="button"
              accessibilityLabel={`${offer.label} : ${offer.price}${offer.period}. Continuer sans limite`}
              style={[
                styles.card,
                { backgroundColor: offer.highlight ? colors.accentSoft : colors.surface, borderColor: colors.border },
                offer.highlight && [styles.cardHighlight, { shadowColor: colors.accent }],
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
              {offer.originalPrice && (
                <Text style={[styles.strikethruPrice, { color: colors.textMuted }]}>
                  {offer.originalPrice}
                </Text>
              )}
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.accent }]}>
                  {offer.price}
                </Text>
                <Text style={[typo.caption as object, { color: colors.textMuted }]}>
                  {offer.period}
                </Text>
              </View>

              {offer.highlight ? (
                <LinearGradient
                  colors={[...colors.gradientProCta]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}>
                  <Text style={[typo.button as object, { color: 'white' }]}>Continuer sans limite</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.btn, { backgroundColor: colors.surfaceHigh }]}>
                  <Text style={[typo.button as object, { color: colors.text }]}>Continuer sans limite</Text>
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
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 28,
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Fraunces_600SemiBold', // voix du compagnon (serif display)
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
  strikethruPrice: { fontSize: 12, fontFamily: 'Inter_400Regular', textDecorationLine: 'line-through', marginTop: 2 },
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
