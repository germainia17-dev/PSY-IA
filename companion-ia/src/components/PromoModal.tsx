import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { type as typo, type Palette } from '../constants/type'

export interface PromoModalProps {
  visible: boolean
  onDismiss: () => void
  colors: Palette
  offers: Array<{ label: string; price: string }>
}

export function PromoModal({ visible, onDismiss, colors, offers }: PromoModalProps) {
  const router = useRouter()

  const handleViewOffer = () => {
    onDismiss()
    router.push('/paywall')
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          {/* Close button */}
          <Pressable onPress={onDismiss} style={styles.closeBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer">
            <Text style={{ fontSize: 20, color: colors.textFaint }} accessibilityElementsHidden importantForAccessibility="no">✕</Text>
          </Pressable>

          {/* Content */}
          <Text style={[styles.title, { color: colors.text }]}>
            Essaie Companion Pro
          </Text>
          <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 8, textAlign: 'center' }]}>
            Accès illimité + thèmes Pro
          </Text>

          {/* Offers */}
          <View style={styles.offersContainer}>
            {offers.slice(0, 2).map((offer, i) => (
              <View key={i} style={[styles.offer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[typo.label as object, { color: colors.text }]}>{offer.label}</Text>
                <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 4 }]}>{offer.price}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <Pressable
            style={[styles.cta, { backgroundColor: colors.accent }]}
            onPress={handleViewOffer}
            accessibilityRole="button"
            accessibilityLabel="Voir l'offre Companion Pro">
            <Text style={[typo.button as object, { color: colors.accentTx }]}>Voir l'offre</Text>
          </Pressable>

          {/* Dismiss text */}
          <Pressable onPress={onDismiss} style={styles.laterBtn}>
            <Text style={[typo.caption as object, { color: colors.textFaint }]}>Rappeler plus tard</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    width: '85%',
    maxWidth: 340,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  offersContainer: {
    gap: 12,
    marginTop: 20,
  },
  offer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  cta: {
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  laterBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
})
