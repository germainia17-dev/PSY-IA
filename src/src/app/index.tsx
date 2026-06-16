import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useFocusEffect, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { sendChatMessage, extractMemory, getProUrl, ChatError } from '../lib/api'
import { usePro } from '../lib/use-pro'
import {
  addMemoryFacts,
  getMemory,
  loadCurrentOrNew,
  newConversation,
  saveConversation,
  setCurrentId,
  type Conversation,
  type Message,
} from '../lib/storage'
import { palettes, type as typo } from '../constants/design'
import { ChatBubble } from '../components/chat-bubble'
import { Orb, type OrbState } from '../components/orb'
import { Starters } from '../components/starters'
import { Confetti } from '../components/confetti'
import { ONBOARDED_KEY } from './onboarding'

// Haptiques : ponctuation, pas vibration permanente.
// Jamais sur scroll, frappe ou respiration de l'orbe.
function haptic(kind: 'send' | 'receive' | 'limit') {
  if (Platform.OS === 'web') return
  if (kind === 'send') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  else if (kind === 'receive') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
}

export default function ChatScreen() {
  const scheme = useColorScheme()
  const colors = palettes[scheme === 'dark' ? 'dark' : 'light']
  const router = useRouter()

  const [convo, setConvo] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [limited, setLimited] = useState(false)
  const [focused, setFocused] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const animateFrom = useRef(0) // index à partir duquel les bulles s'animent
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proPoll = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setOnboarded(v === '1'))
    return () => {
      if (speakTimer.current) clearTimeout(speakTimer.current)
      if (proPoll.current) clearTimeout(proPoll.current)
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
    } catch (err) {
      if (err instanceof ChatError && err.code === 'limit_reached') {
        haptic('limit')
        setLimited(true)
        await saveConversation(optimistic)
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
    const fresh = newConversation()
    await setCurrentId(fresh.id)
    animateFrom.current = fresh.messages.length
    setConvo(fresh)
    setLimited(false)
    setInput('')
  }

  async function openPro() {
    const url = await getProUrl()
    Linking.openURL(url)
    // Le webhook Stripe active le Pro en quelques secondes. On resonde le plan
    // jusqu'à ce qu'il bascule (utile sur le web, où l'écran reste affiché
    // pendant le checkout dans un autre onglet). Chaîne de setTimeout plutôt
    // qu'un setInterval : le tick suivant n'est planifié qu'une fois isPro()
    // résolu, donc pas de requêtes qui se chevauchent sous réseau lent.
    if (proPoll.current) clearTimeout(proPoll.current)
    let tries = 0
    const poll = async () => {
      tries += 1
      if (await refreshPro()) return
      if (tries < 12) proPoll.current = setTimeout(poll, 5000)
    }
    proPoll.current = setTimeout(poll, 5000)
  }

  // Amorce choisie : on pré-remplit le champ (sans envoyer) et on donne le focus,
  // l'utilisateur complète avec ses propres mots.
  function pickStarter(prefill: string) {
    setInput(prefill)
    setTimeout(() => inputRef.current?.focus(), 60)
  }

  const hasText = input.trim().length > 0
  // Conversation neuve = seulement le message d'accueil. On remplit le vide avec
  // des amorces plutôt que de laisser un écran noir.
  const isFresh = messages.length <= 1 && !limited && !sending

  // Premier lancement : on naît dans l'onboarding, pas dans le chat
  if (onboarded === null || convo === null) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]} />
  }
  if (!onboarded) {
    return <Redirect href="/onboarding" />
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Orb state={limited ? 'idle' : orbState} size={38} />
        <View style={styles.headerCenter}>
          <Text style={[typo.subtitle as object, { color: colors.text }]}>Companion</Text>
          <Text style={[typo.caption as object, { color: colors.textMuted }]}>
            sans compte · privé
          </Text>
        </View>
        <Pressable onPress={handleNew} style={styles.iconBtn} hitSlop={8}>
          <Text style={{ fontSize: 22, color: colors.textMuted }}>＋</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/history')} style={styles.iconBtn} hitSlop={8}>
          <Text style={{ fontSize: 18, color: colors.textMuted }}>🕘</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn} hitSlop={8}>
          <Text style={{ fontSize: 20, color: colors.textMuted }}>⚙</Text>
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
            <Starters colors={colors} onPick={pickStarter} />
          ) : null
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {limited ? (
          <View style={[styles.limitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ opacity: 0.55, transform: [{ scale: 0.85 }] }}>
              <Orb state="idle" size={72} />
            </View>
            <Text style={[typo.subtitle as object, { color: colors.text, textAlign: 'center' }]}>
              On se retrouve demain ?
            </Text>
            <Text style={[typo.caption as object, { color: colors.textMuted, textAlign: 'center', maxWidth: 280 }]}>
              Tu as atteint ta limite de messages pour aujourd'hui. Je serai là dès demain. Prends
              soin de toi d'ici là.
            </Text>
            <TouchableOpacity
              style={[styles.proBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
              onPress={openPro}>
              <Text style={[typo.button as object, { color: colors.accentTx }]}>Continuer avec Companion Pro</Text>
            </TouchableOpacity>
            <Text style={[typo.caption as object, { color: colors.textMuted }]}>
              Conversations illimitées · sans publicité
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
              activeOpacity={0.8}>
              <Text style={{ color: hasText && !sending ? colors.accentTx : colors.textFaint, fontSize: 18, fontWeight: '600' }}>
                ↑
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  limitCard: {
    alignItems: 'center',
    gap: 12,
    margin: 16,
    padding: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
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
