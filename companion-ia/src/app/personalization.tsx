import { useEffect, useState } from 'react'
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { usePro } from '../lib/use-pro'
import {
  DEFAULT_PERSONALIZATION,
  getPersonalization,
  setPersonalization,
  type Personalization,
} from '../lib/storage'
import { type as typo, type Palette } from '../constants/type'
import { accents, type AccentId, type ThemeId } from '../constants/design'
import { useTheme, useThemeController } from '../lib/theme'
import { confirm } from '../lib/confirm'

// ── Catalogues d'options ──────────────────────────────────────
// Gratuit : logo (upload) + accent. Pro : thème + ton de l'IA.
// Les couleurs d'accent vivent dans design.ts (source unique, appliquée par le
// ThemeProvider) — on en dérive juste la liste ordonnée pour les pastilles.
const ACCENT_LIST = (Object.entries(accents) as [AccentId, { accent: string }][]).map(
  ([id, t]) => ({ id, color: t.accent }),
)

const THEMES: { id: ThemeId; label: string; desc: string }[] = [
  { id: 'cream', label: 'Crème', desc: 'Le thème par défaut, papier chaud' },
  { id: 'nuit', label: 'Nuit douce', desc: 'Ambiance lampe de chevet tamisée' },
  { id: 'foret', label: 'Forêt', desc: 'Verts profonds et apaisants' },
  { id: 'aurore', label: 'Aurore', desc: 'Dégradés pastel du petit matin' },
]

const TONES: { id: string; label: string; desc: string }[] = [
  { id: 'doux', label: 'Doux', desc: 'Tendre et rassurant' },
  { id: 'direct', label: 'Direct', desc: "Franc, va à l'essentiel" },
  { id: 'motivant', label: 'Motivant', desc: 'Encourageant et énergique' },
  { id: 'pose', label: 'Posé', desc: 'Calme et réfléchi' },
]

export default function PersonalizationScreen() {
  const colors = useTheme()
  const { themeId, accentId, setTheme, setAccent } = useThemeController()
  const router = useRouter()
  const { pro } = usePro()

  const [perso, setPerso] = useState<Personalization>(DEFAULT_PERSONALIZATION)

  useEffect(() => {
    getPersonalization().then(setPerso).catch(() => {})
  }, [])

  // Enregistre immédiatement chaque choix (pas de bouton « valider »).
  function update(patch: Partial<Personalization>) {
    setPerso((prev) => ({ ...prev, ...patch })) // optimiste
    setPersonalization(patch).catch(() => {})
  }

  // Clic sur une option Pro : si non abonné → redirection vers les abonnements.
  const goPro = () => router.push('/paywall')

  // Upload du logo. Web : data URI base64 (pas de système de fichiers). Natif :
  // on écrit l'image sur disque (documentDirectory) et on ne stocke que l'URI —
  // sinon un gros base64 dans AsyncStorage casse la lecture sur Android.
  async function pickLogo() {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: Platform.OS === 'web',
    })
    if (result.canceled) return
    const asset = result.assets[0]

    let uri: string
    if (Platform.OS === 'web') {
      uri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri
    } else {
      // Nom unique = busting du cache Image de React Native à chaque changement.
      const dest = `${FileSystem.documentDirectory}companion-logo-${Date.now()}.jpg`
      await FileSystem.copyAsync({ from: asset.uri, to: dest })
      uri = dest
    }

    await deletePrevLogoFile()
    update({ logo: uri })
  }

  function removeLogo() {
    confirm({
      title: 'Supprimer le logo ?',
      message: 'Ton compagnon reviendra à son apparence par défaut.',
      confirmLabel: 'Supprimer',
      destructive: true,
      onConfirm: async () => {
        await deletePrevLogoFile()
        update({ logo: null })
      },
    })
  }

  // Supprime le fichier logo précédent (natif) pour ne pas les accumuler.
  async function deletePrevLogoFile() {
    if (Platform.OS !== 'web' && perso.logo?.startsWith('file:')) {
      await FileSystem.deleteAsync(perso.logo, { idempotent: true }).catch(() => {})
    }
  }

  const accent = colors.accent

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Aperçu du compagnon */}
        <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {perso.logo ? (
            <Image source={{ uri: perso.logo }} style={[styles.previewAvatar, { backgroundColor: colors.bg }]} />
          ) : (
            <View style={[styles.previewAvatar, styles.previewEmpty, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={{ fontSize: 28, color: colors.textFaint }}>🖼️</Text>
            </View>
          )}
          <Text style={[typo.caption as object, { color: colors.textMuted }]}>
            {perso.logo ? 'Aperçu de ton logo' : 'Aucun logo pour le moment'}
          </Text>
        </View>

        {/* ── Gratuit ───────────────────────────── */}
        <Section label="Logo" colors={colors}>
          <TouchableOpacity
            style={[styles.proBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
            onPress={pickLogo}>
            <Text style={[typo.button as object, { color: colors.accentTx }]}>
              {perso.logo ? 'Changer le logo' : 'Uploader une image'}
            </Text>
          </TouchableOpacity>
          {perso.logo && (
            <TouchableOpacity onPress={removeLogo} hitSlop={8} style={{ alignItems: 'center' }}>
              <Text style={[typo.label as object, { color: colors.error }]}>Supprimer le logo</Text>
            </TouchableOpacity>
          )}
        </Section>

        <Section label="Couleur d'accent" colors={colors}>
          <View style={styles.grid}>
            {ACCENT_LIST.map((a) => {
              const selected = accentId === a.id
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAccent(a.id)}
                  style={[styles.swatch, { backgroundColor: a.color, borderColor: selected ? colors.text : 'transparent' }]}>
                  {selected && <Text style={styles.swatchCheck}>✓</Text>}
                </Pressable>
              )
            })}
          </View>
        </Section>

        {/* ── Premium ───────────────────────────── */}
        <Section label="Thème" pro colors={colors}>
          {THEMES.map((t, i) => (
            <OptionRow
              key={t.id}
              label={t.label}
              desc={t.desc}
              selected={pro && themeId === t.id}
              locked={!pro}
              accent={accent}
              colors={colors}
              first={i === 0}
              onPress={() => (pro ? setTheme(t.id) : goPro())}
            />
          ))}
        </Section>

        <Section label="Ton de l'IA" pro colors={colors}>
          {TONES.map((t, i) => (
            <OptionRow
              key={t.id}
              label={t.label}
              desc={t.desc}
              selected={pro && perso.tone === t.id}
              locked={!pro}
              accent={accent}
              colors={colors}
              first={i === 0}
              onPress={() => (pro ? update({ tone: t.id }) : goPro())}
            />
          ))}
        </Section>

        {!pro && (
          <TouchableOpacity
            style={[styles.proBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
            onPress={goPro}>
            <Text style={[typo.button as object, { color: colors.accentTx }]}>Débloquer avec Companion Pro</Text>
          </TouchableOpacity>
        )}

        {pro && (
          <Text style={[typo.caption as object, { color: colors.textFaint, textAlign: 'center' }]}>
            Le thème s'applique tout de suite ; le ton choisi guide les réponses de ton compagnon.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({
  label,
  pro,
  children,
  colors,
}: {
  label: string
  pro?: boolean
  children: React.ReactNode
  colors: Palette
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
        {pro && (
          <View style={[styles.proBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.proBadgeTx, { color: colors.accentTx }]}>PRO ✦</Text>
          </View>
        )}
      </View>
      <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  )
}

function OptionRow({
  label,
  desc,
  selected,
  locked,
  accent,
  colors,
  first,
  onPress,
}: {
  label: string
  desc: string
  selected: boolean
  locked?: boolean
  accent: string
  colors: Palette
  first: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        { opacity: pressed ? 0.6 : locked ? 0.7 : 1 },
      ]}>
      <View style={{ flex: 1 }}>
        <Text style={[typo.label as object, { color: colors.text }]}>{label}</Text>
        <Text style={[typo.caption as object, { color: colors.textMuted }]}>{desc}</Text>
      </View>
      {locked ? (
        <View style={[styles.proPill, { borderColor: accent }]}>
          <Text style={[styles.proPillTx, { color: accent }]}>PRO ✦</Text>
        </View>
      ) : (
        <View style={[styles.radio, { borderColor: selected ? accent : colors.border }]}>
          {selected && <View style={[styles.radioDot, { backgroundColor: accent }]} />}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  preview: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  previewEmpty: { borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  proBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  proBadgeTx: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  sectionBody: { borderRadius: 16, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  swatchCheck: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  proPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  proPillTx: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  proBtn: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
})
