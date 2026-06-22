import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useFocusEffect, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { sendChatMessage, extractMemory, summarizeSession, recordMood, ChatError, isPro, PRO_OFFERS } from '../lib/api'
import { usePro } from '../lib/use-pro'
import { logEvent } from '../lib/events'
import { getLinkedEmail } from '../lib/auth'
import {
  addMemoryFacts,
  getMemory,
  getStreak,
  getTodayMood,
  getUserName,
  loadCurrentOrNew,
  newConversation,
  saveConversation,
  saveSessionSummary,
  setCurrentId,
  setTodayMood,
  type Conversation,
  type Message,
} from '../lib/storage'
import {
  enableDailyReminder,
  markReminderAsked,
  refreshDailyReminderFromThemes,
  reminderAsked,
} from '../lib/notifications'
import { type as typo } from '../constants/type'
import { useTheme } from '../hooks/use-theme'
import { ChatBubble } from '../components/chat-bubble'
import { Orb, type OrbState } from '../components/orb'
import { Starters } from '../components/starters'
import { Confetti } from '../components/confetti'
import { PromoModal } from '../components/PromoModal'
import { ONBOARDED_KEY } from './onboarding'
import { Ionicons } from '@expo/vector-icons'

// Haptiques : ponctuation, pas vibration permanente.
// Jamais sur scroll, frappe ou respiration de l'orbe.
function haptic(kind: 'send' | 'receive' | 'limit') {
  if (Platform.OS === 'web') return
  if (kind === 'send') {
    // Envoi : court et léger (le message part)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } else if (kind === 'receive') {
    // Réception : plus marqué et distinct (la réponse arrive)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  } else if (kind === 'limit') {
    // Limite atteinte : notification d'avertissement
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  }
}

// Échelle d'humeur (index 0 → valeur 1). Un seul tap, sur conversation neuve.
const MOODS = ['😔', '😕', '😐', '🙂', '😄']
// Libellés lecteur d'écran (l'emoji seul n'est pas explicite à l'oral).
const MOOD_LABELS = ['Très mal', 'Plutôt mal', 'Neutre', 'Plutôt bien', 'Très bien']

export default function ChatScreen() {
  const colors = useTheme()
  const router = useRouter()

  const [convo, setConvo] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [limited, setLimited] = useState(false)
  const [focused, setFocused] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [hasAccount, setHasAccount] = useState<boolean | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [askReminder, setAskReminder] = useState(false)
  const [todayMood, setTodayMoodState] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)
  const [showPromo, setShowPromo] = useState(false)
  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const animateFrom = useRef(0) // index à partir duquel les bulles s'animent
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setOnboarded(v === '1'))
    getLinkedEmail().then((email) => setHasAccount(!!email)).catch(() => setHasAccount(false))
    // Pas de promo au lancement à froid : on ne propose Pro qu'après avoir livré
    // de la valeur (cf. handleSend, après quelques échanges).
    return () => {
      if (speakTimer.current) clearTimeout(speakTimer.current)
    }
  }, [])

  // État Pro partagé. À la bascule : on lève la limite et on lance les confettis.
  const { refresh: refreshPro } = usePro(() => {
    setLimited(false)
    setShowConfetti(true)
  })

  // Recharge la conversation courante à chaque fois qu'on revient sur l'écran
  // (depuis l'historique on a pu changer de séance).
  useFocusEffect(
    useCallback(() => {
      let active = true
      loadCurrentOrNew().then((c) => {
        if (!active) return
        animateFrom.current = c.messages.length
        setConvo(c)
      })
      // Humeur du jour + série de présence : rafraîchies à chaque retour sur le chat.
      getTodayMood().then((m) => active && setTodayMoodState(m))
      getStreak().then((s) => active && setStreak(s))
      return () => {
        active = false
      }
    }, []),
  )

  const messages = convo?.messages ?? []

  // L'orbe vit la conversation : écoute quand tu écris, réfléchit en attendant,
  // s'anime quand il pose ses mots, dort sur l'écran de limite.
  const orbState: OrbState = sending
    ? 'thinking'
    : speaking
      ? 'speaking'
      : focused || input.trim().length > 0
        ? 'listening'
        : 'idle'

  const scrollToBottom = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)

  async function handleSend() {
    if (!convo || !input.trim() || sending || limited) return

    haptic('send')
    const userMsg: Message = { role: 'user', content: input.trim() }
    const next: Message[] = [...convo.messages, userMsg]
    const optimistic = { ...convo, messages: next }
    animateFrom.current = next.length - 1
    setConvo(optimistic)
    setInput('')
    setSending(true)
    scrollToBottom()

    const typingTimer = setTimeout(() => setShowTyping(true), 400)

    try {
      const memory = (await getMemory()).map((f) => f.text)
      const result = await sendChatMessage(next, memory)
      const withReply: Message[] = [...next, { role: 'assistant', content: result.text }]
      const saved = await saveConversation({ ...convo, messages: withReply })
      animateFrom.current = withReply.length - 1
      setConvo(saved)
      haptic('receive')
      setSpeaking(true)
      if (speakTimer.current) clearTimeout(speakTimer.current)
      speakTimer.current = setTimeout(() => setSpeaking(false), 2000)

      // Mémoire : on extrait les faits durables (sans quota). Déclenché par le
      // NOMBRE DE TOURS UTILISATEUR — la longueur brute est toujours impaire
      // (message d'accueil + paires), donc un modulo dessus ne tombait jamais
      // juste. On capture vite (dès le 1er message, souvent le prénom) puis
      // régulièrement (tours pairs).
      const userTurns = withReply.filter((m) => m.role === 'user').length
      if (userTurns === 1 || userTurns % 2 === 0) {
        extractMemory(withReply).then((facts) => {
          if (facts.length > 0) addMemoryFacts(facts)
        })
      }

      // Résumé + thèmes de la séance (best-effort, sans quota). Dès qu'il y a de
      // la matière (≥ 2 tours), tous les 2 tours pour limiter les appels. Nourrit
      // l'historique « ce dont on a parlé » ET la relance personnalisée — c'est ce
      // qui rend vraie la promesse « il se souvient de toi ».
      if (userTurns >= 2 && userTurns % 2 === 0) {
        summarizeSession(withReply).then(async ({ summary, themes }) => {
          if (!summary && themes.length === 0) return
          await saveSessionSummary(saved.id, summary, themes)
          // Reflète le résumé en mémoire pour qu'un prochain envoi ne l'écrase pas.
          setConvo((c) => (c && c.id === saved.id ? { ...c, summary, themes } : c))
          await refreshDailyReminderFromThemes()
        })
      }

      // Après le tout premier échange — le moment où le lien se crée — on propose
      // (une seule fois) un rappel quotidien. C'est le levier de rétention J1/J7.
      if (userTurns === 1 && Platform.OS !== 'web' && !(await reminderAsked())) {
        setAskReminder(true)
      }

      // Promo Pro : seulement après quelques échanges — la valeur est livrée,
      // jamais une pub à froid au lancement. Une seule fois, hors abonnés.
      if (userTurns >= 3) {
        const shown = await AsyncStorage.getItem('@companion_promo_shown')
        if (!shown && !(await isPro())) setShowPromo(true)
      }
    } catch (err) {
      if (err instanceof ChatError && err.code === 'limit_reached') {
        haptic('limit')
        setLimited(true)
        await saveConversation(optimistic)
        await logEvent('limit_reached')
      } else {
        const content =
          err instanceof ChatError
            ? err.message
            : 'Je n’arrive pas à te répondre là tout de suite. Réessaie dans un instant.'
        const withErr: Message[] = [...next, { role: 'assistant', content }]
        setConvo({ ...convo, messages: withErr })
        await saveConversation({ ...convo, messages: withErr })
      }
    } finally {
      clearTimeout(typingTimer)
      setShowTyping(false)
      setSending(false)
      scrollToBottom()
    }
  }

  async function handleNew() {
    const fresh = newConversation(await getUserName())
    await setCurrentId(fresh.id)
    animateFrom.current = fresh.messages.length
    setConvo(fresh)
    setLimited(false)
    setInput('')
  }

  // Amorce choisie : on pré-remplit le champ (sans envoyer) et on donne le focus,
  // l'utilisateur complète avec ses propres mots.
  function pickStarter(prefill: string) {
    setInput(prefill)
    setTimeout(() => inputRef.current?.focus(), 60)
  }

  // Humeur du jour : enregistrée localement, mise à jour optimiste de l'UI.
  function pickMood(value: number) {
    setTodayMoodState(value)
    setTodayMood(value).catch(() => {})
    recordMood(value).catch(() => {})
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  async function acceptReminder() {
    await enableDailyReminder()
    await markReminderAsked()
    setAskReminder(false)
  }
  async function dismissReminder() {
    await markReminderAsked()
    setAskReminder(false)
  }

  const hasText = input.trim().length > 0
  // Conversation neuve = seulement le message d'accueil. On remplit le vide avec
  // des amorces plutôt que de laisser un écran noir.
  const isFresh = messages.length <= 1 && !limited && !sending

  // Premier lancement : on naît dans l'onboarding, pas dans le chat
  if (onboarded === null || convo === null || hasAccount === null) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]} />
  }
  if (!onboarded) {
    return <Redirect href="/onboarding" />
  }
  if (!hasAccount) {
    return <Redirect href="/account" />
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Orb state={limited ? 'idle' : orbState} size={38} />
        <View style={styles.headerCenter}>
          <Text style={[typo.subtitle as object, { color: colors.text }]}>Companion</Text>
          <Text style={[typo.caption as object, { color: colors.textMuted }]}>
            sans compte · local
          </Text>
        </View>
        {streak > 0 ? (
          <Pressable
            onPress={() => router.push('/journey')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Ta série de présence : ${streak} ${streak > 1 ? 'jours' : 'jour'}`}
            style={[styles.streakPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="flame" size={13} color={colors.accent} />
            <Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{streak}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={handleNew} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Nouvelle conversation">
          <Ionicons name="add" size={22} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => router.push('/history')} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Conversations">
          <Ionicons name="time-outline" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => router.push('/evolution' as never)} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Ton évolution">
          <Ionicons name="trending-up-outline" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Paramètres">
          <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToBottom}
        renderItem={({ item, index }) => {
          const prev = messages[index - 1]
          const sameSpeaker = prev && prev.role === item.role
          return (
            <View style={{ marginTop: index === 0 ? 0 : sameSpeaker ? 3 : 14 }}>
              <ChatBubble message={item} colors={colors} animate={index >= animateFrom.current} />
            </View>
          )
        }}
        ListFooterComponent={
          showTyping ? (
            <View style={styles.typingOrb}>
              <Orb state="thinking" size={36} />
            </View>
          ) : isFresh ? (
            <View>
              {todayMood === null ? (
                <View style={styles.moodRow}>
                  <Text style={[styles.moodLabel, { color: colors.textFaint }]}>COMMENT TU TE SENS ?</Text>
                  <View style={styles.moodEmojis}>
                    {MOODS.map((emoji, i) => (
                      <Pressable
                        key={i}
                        onPress={() => pickMood(i + 1)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Humeur : ${MOOD_LABELS[i]} (${i + 1} sur 5)`}>
                        <Text style={{ fontSize: 30 }} accessibilityElementsHidden importantForAccessibility="no">{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              <Starters colors={colors} onPick={pickStarter} />
            </View>
          ) : null
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {askReminder ? (
          <View style={[styles.limitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typo.subtitle as object, { color: colors.text, textAlign: 'center' }]}>
              Je passe te faire un coucou demain ?
            </Text>
            <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center', maxWidth: 280 }]}>
              Un rappel doux chaque soir à 20h, pour prendre un moment rien que pour toi. Tu peux
              l'arrêter quand tu veux.
            </Text>
            <TouchableOpacity
              style={[styles.proBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
              onPress={acceptReminder}>
              <Text style={[typo.button as object, { color: colors.accentTx }]}>Oui, chaque soir</Text>
            </TouchableOpacity>
            <Pressable onPress={dismissReminder} hitSlop={8}>
              <Text style={[typo.caption as object, { color: colors.textMuted }]}>Plus tard</Text>
            </Pressable>
          </View>
        ) : null}
        {limited ? (
          <View style={[styles.limitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ opacity: 0.55, transform: [{ scale: 0.85 }] }}>
              <Orb state="idle" size={72} />
            </View>
            <Text style={[typo.subtitle as object, { color: colors.text, textAlign: 'center' }]}>
              On se retrouve demain ?
            </Text>
            <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center', maxWidth: 280 }]}>
              Tu as atteint ta limite de messages pour aujourd&apos;hui. Je serai là dès demain pour continuer.
            </Text>
            <View style={styles.limitActions}>
              <TouchableOpacity
                style={[styles.limitBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
                activeOpacity={0.85}
                onPress={async () => {
                  await logEvent('view_evolution_clicked')
                  router.push('/journey' as never)
                }}>
                <Text style={[typo.button as object, { color: colors.accent }]}>Voir ton évolution</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.limitBtn, { backgroundColor: colors.accent }]}
                activeOpacity={0.85}
                onPress={async () => {
                  await logEvent('upgrade_clicked')
                  router.push('/paywall')
                }}>
                <Text style={[typo.button as object, { color: colors.accentTx }]}>Continuer maintenant</Text>
              </TouchableOpacity>
            </View>
            <Text style={[typo.caption as object, { color: colors.textFaint, textAlign: 'center', fontSize: 12 }]}>
              Pro: illimitées · Sans interruption
            </Text>
          </View>
        ) : (
          <View style={[styles.composer, { borderTopColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.field,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: focused ? colors.accent : 'transparent',
                },
              ]}
              value={input}
              onChangeText={setInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              accessibilityLabel="Écris ton message"
              placeholder="Dis-moi ce que tu ressens…"
              placeholderTextColor={colors.textFaint}
              multiline
              // Entrée = envoyer. Maj+Entrée = retour à la ligne.
              onKeyPress={(e) => {
                const ev = e.nativeEvent as { key?: string; shiftKey?: boolean }
                if (ev.key === 'Enter' && !ev.shiftKey) {
                  ;(e as unknown as { preventDefault?: () => void }).preventDefault?.()
                  if (hasText && !sending) handleSend()
                }
              }}
              onSubmitEditing={() => {
                if (hasText && !sending) handleSend()
              }}
              submitBehavior="submit"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: hasText && !sending ? colors.accent : colors.surfaceHigh },
              ]}
              onPress={handleSend}
              disabled={!hasText || sending}
              accessibilityRole="button"
              accessibilityLabel="Envoyer"
              accessibilityState={{ disabled: !hasText || sending }}
              activeOpacity={0.8}>
              <Text style={{ color: hasText && !sending ? colors.accentTx : colors.textFaint, fontSize: 18, fontFamily: 'Inter_600SemiBold' }} accessibilityElementsHidden importantForAccessibility="no">
                ↑
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />

      <PromoModal
        visible={showPromo}
        onDismiss={async () => {
          setShowPromo(false)
          await AsyncStorage.setItem('@companion_promo_shown', '1')
        }}
        colors={colors}
        offers={PRO_OFFERS.slice(0, 2).map((o) => ({ label: o.label, price: `${o.price}${o.period}` }))}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerCenter: { flex: 1, marginLeft: 2 },
  iconBtn: { padding: 6 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 2,
  },
  moodRow: { marginTop: 28, alignItems: 'center', gap: 4 },
  moodLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  moodEmojis: { flexDirection: 'row', gap: 14, marginTop: 6 },
  list: { paddingHorizontal: 16, paddingVertical: 12 },
  typingOrb: { marginTop: 14, alignSelf: 'flex-start', marginLeft: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  field: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 16,
    borderWidth: 1.5,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitCard: {
    alignItems: 'center',
    gap: 12,
    margin: 16,
    padding: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  limitActions: {
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  limitBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderWidth: 1.5,
  },
  proBtn: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: 8,
  },
})
