import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

// Séances programmées : des rendez-vous doux avec son compagnon. Tout est local
// (notifications planifiées sur l'appareil), rien ne passe par un serveur.

export type Session = {
  id: string
  hour: number
  minute: number
  days: number[] // 1=dimanche … 7=samedi (convention expo WEEKLY)
  notifIds: string[]
}

const KEY = '@companion_sessions'

// 1=dimanche pour coller à expo. Affichage commençant par lundi.
export const WEEKDAYS = [
  { id: 2, short: 'L', full: 'Lundi' },
  { id: 3, short: 'M', full: 'Mardi' },
  { id: 4, short: 'M', full: 'Mercredi' },
  { id: 5, short: 'J', full: 'Jeudi' },
  { id: 6, short: 'V', full: 'Vendredi' },
  { id: 7, short: 'S', full: 'Samedi' },
  { id: 1, short: 'D', full: 'Dimanche' },
]

const REMINDERS = [
  'Un moment pour toi. Comment va ta journée ?',
  'Je suis là si tu veux parler.',
  'Prends une minute pour souffler. Je t\'écoute.',
  'Comment tu te sens, là, maintenant ?',
]

let configured = false

export function configureNotifications() {
  if (configured || Platform.OS === 'web') return
  configured = true
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const req = await Notifications.requestPermissionsAsync()
  return req.granted
}

export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(KEY)
  return raw ? JSON.parse(raw) : []
}

async function persist(sessions: Session[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(sessions))
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function pickReminder(seed: number): string {
  return REMINDERS[seed % REMINDERS.length]
}

// Planifie une séance récurrente (une notif hebdo par jour coché).
export async function addSession(hour: number, minute: number, days: number[]): Promise<Session | null> {
  if (Platform.OS === 'web' || days.length === 0) return null
  if (!(await ensurePermission())) return null

  const notifIds: string[] = []
  for (const weekday of days) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Companion', body: pickReminder(hour + weekday), sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    })
    notifIds.push(id)
  }

  const session: Session = { id: uid(), hour, minute, days: [...days].sort(), notifIds }
  const sessions = [...(await getSessions()), session]
  await persist(sessions)
  return session
}

export async function removeSession(id: string): Promise<void> {
  const sessions = await getSessions()
  const target = sessions.find((s) => s.id === id)
  if (target) {
    for (const nid of target.notifIds) {
      await Notifications.cancelScheduledNotificationAsync(nid).catch(() => {})
    }
  }
  await persist(sessions.filter((s) => s.id !== id))
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function describeDays(days: number[]): string {
  if (days.length === 7) return 'Tous les jours'
  if (days.length === 5 && !days.includes(1) && !days.includes(7)) return 'En semaine'
  if (days.length === 2 && days.includes(1) && days.includes(7)) return 'Le week-end'
  return WEEKDAYS.filter((w) => days.includes(w.id))
    .map((w) => w.full.slice(0, 3))
    .join(', ')
}
