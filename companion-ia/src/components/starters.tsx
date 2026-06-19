import { Pressable, StyleSheet, View, Text } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { type as typo, type Palette } from '../constants/type'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const STARTERS: {
  icon: IoniconsName
  title: string
  subtitle: string
  prefill: string
}[] = [
  { icon: 'partly-sunny-outline', title: 'Ma journée',         subtitle: "Raconte comment elle s'est passée", prefill: "Aujourd'hui, " },
  { icon: 'bulb-outline',         title: 'Mes idées',          subtitle: 'Note ce qui te trotte en tête',    prefill: "J'ai une idée : " },
  { icon: 'calendar-outline',     title: 'Ce qui est prévu',   subtitle: 'Ce que tu as devant toi',          prefill: 'Cette semaine, je dois ' },
  { icon: 'heart-outline',        title: 'Comment je me sens', subtitle: 'Mets des mots dessus',             prefill: 'Là, je me sens ' },
]

export { STARTERS }

export function Starters({ colors, onPick }: { colors: Palette; onPick: (prefill: string) => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={[styles.labelDot, { backgroundColor: colors.accent }]} />
        <Text style={[styles.label, { color: colors.textFaint }]}>PAR OÙ COMMENCER ?</Text>
      </View>
      <View style={styles.grid}>
        {STARTERS.map((s, i) => (
          <Animated.View key={s.title} entering={FadeInDown.delay(120 + i * 70).springify().damping(18)} style={styles.cell}>
            <Pressable
              onPress={() => onPick(s.prefill)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
              ]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name={s.icon} size={20} color={colors.accent} />
              </View>
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
  wrap: { marginTop: 24, gap: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 2 },
  labelDot: { width: 5, height: 5, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%', flexGrow: 1 },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 8,
    minHeight: 126,
    shadowColor: '#1A0A03',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
