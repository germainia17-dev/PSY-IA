import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { type as typo, type Palette } from '../constants/type'

// Amorces affichées sur une conversation neuve — elles remplissent le vide et
// donnent un point de départ. Taper une carte pré-remplit le champ (pas d'envoi
// direct : l'utilisateur garde la main sur ses mots).
export const STARTERS = [
  { icon: '🌤️', title: 'Ma journée', subtitle: "Raconte comment elle s'est passée", prefill: "Aujourd'hui, " },
  { icon: '💡', title: 'Mes idées', subtitle: 'Note ce qui te trotte en tête', prefill: "J'ai une idée : " },
  { icon: '🗓️', title: 'Ce qui est prévu', subtitle: 'Ce que tu as devant toi', prefill: 'Cette semaine, je dois ' },
  { icon: '🫧', title: 'Comment je me sens', subtitle: 'Mets des mots dessus', prefill: 'Là, je me sens ' },
] as const

export function Starters({ colors, onPick }: { colors: Palette; onPick: (prefill: string) => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textFaint }]}>PAR QUOI COMMENCER ?</Text>
      <View style={styles.grid}>
        {STARTERS.map((s, i) => (
          <Animated.View key={s.title} entering={FadeInDown.delay(120 + i * 70).springify().damping(18)} style={styles.cell}>
            <Pressable
              onPress={() => onPick(s.prefill)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
              ]}>
              <Text style={styles.icon}>{s.icon}</Text>
              <Text style={[typo.label as object, { color: colors.text }]}>{s.title}</Text>
              <Text style={[typo.caption as object, { color: colors.textMuted }]} numberOfLines={2}>
                {s.subtitle}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28, gap: 12 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
    minHeight: 112,
  },
  icon: { fontSize: 24, marginBottom: 2 },
})
