import { useRef, useState } from 'react'
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getProUrl, PRO_OFFERS, type PlanInterval } from '../lib/api'
import { usePro } from '../lib/use-pro'
import { Confetti } from '../components/confetti'
import { type as typo } from '../constants/type'
import { useTheme } from '../hooks/use-theme'

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
        <Text style={[typo.subtitle as object, { color: colors.text, textAlign: 'center' }]}>
          Companion Pro ✦
        </Text>
        <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 24 }]}>
          Messages illimités · mémoire active · sync multi-appareils
        </Text>

        <View style={styles.cards}>
          {PRO_OFFERS.map((offer) => (
            <TouchableOpacity
              key={offer.interval}
              activeOpacity={0.85}
              onPress={() => openPro(offer.interval)}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: offer.highlight ? colors.accent : colors.border },
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

              <View style={[
                styles.btn,
                { backgroundColor: offer.highlight ? colors.accent : colors.surface, borderColor: colors.border },
                !offer.highlight && { borderWidth: StyleSheet.hairlineWidth },
              ]}>
                <Text style={[typo.button as object, { color: offer.highlight ? colors.accentTx : colors.text }]}>
                  Choisir
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[typo.caption as object, { color: colors.textFaint, textAlign: 'center', marginTop: 20 }]}>
          Résiliation possible à tout moment depuis Paramètres.
        </Text>
      </ScrollView>

      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  cards: { gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 4,
  },
  cardHighlight: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  price: { fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  btn: {
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
