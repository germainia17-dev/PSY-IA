// Client du backend PSY-IA. Gère la session anonyme Supabase et le relais chat.
import { supabase } from './supabase'
import type { Message } from './storage'

// Lien de paiement Stripe (Companion Pro). On y accroche l'user_id en
// client_reference_id pour qu'un webhook puisse activer le Pro côté backend.
const STRIPE_PRO_LINK = 'https://buy.stripe.com/fZu28q4YQcHG7jM8ijfrW04'

export type ChatResult = {
  text: string
  remaining: number // messages restants aujourd'hui (999999 = pro)
}

export class ChatError extends Error {
  constructor(
    public code: 'limit_reached' | 'auth' | 'unavailable' | 'unknown',
    message: string,
  ) {
    super(message)
  }
}

async function ensureSession(): Promise<{ token: string; userId: string }> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return { token: data.session.access_token, userId: data.session.user.id }

  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.session) {
    throw new ChatError('auth', error?.message ?? 'Connexion impossible')
  }
  return { token: anon.session.access_token, userId: anon.session.user.id }
}

function functionUrl(name: string): string {
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL!}/functions/v1/${name}`
}

export async function sendChatMessage(messages: Message[], memory: string[] = []): Promise<ChatResult> {
  const { token } = await ensureSession()

  const response = await fetch(functionUrl('chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, memory }),
  })

  const data = await response.json().catch(() => null)

  if (response.status === 429) {
    throw new ChatError('limit_reached', data?.message ?? 'Limite quotidienne atteinte.')
  }
  if (response.status === 401) {
    throw new ChatError('auth', 'Session expirée, relance l’app.')
  }
  if (!response.ok || !data?.text) {
    throw new ChatError('unavailable', data?.message ?? `Erreur ${response.status}`)
  }

  return { text: data.text, remaining: data.remaining ?? -1 }
}

// Extraction de mémoire : l'IA repère les faits durables. Ne consomme pas de
// quota, ne stocke rien côté serveur — les faits reviennent au client.
export async function extractMemory(messages: Message[]): Promise<string[]> {
  try {
    const { token } = await ensureSession()
    const response = await fetch(functionUrl('chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode: 'extract', messages }),
    })
    if (!response.ok) return []
    const data = await response.json().catch(() => null)
    return Array.isArray(data?.facts) ? data.facts.filter((f: unknown) => typeof f === 'string') : []
  } catch {
    return [] // l'extraction est best-effort, jamais bloquante
  }
}

// Le plan a-t-il basculé en Pro ? On lit la table profiles (RLS : chacun lit le
// sien). Sert à lever l'écran de limite quand l'utilisateur revient de Stripe.
export async function isPro(): Promise<boolean> {
  try {
    const { userId } = await ensureSession()
    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle()
    return data?.plan === 'pro'
  } catch {
    return false
  }
}

// Génère une session Stripe Customer Portal pour gérer/résilier l'abonnement.
export async function getPortalUrl(returnUrl?: string): Promise<string> {
  const { token } = await ensureSession()
  const response = await fetch(functionUrl('stripe-portal'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ return_url: returnUrl }),
  })
  if (!response.ok) throw new Error('Portail indisponible')
  const data = await response.json()
  return data.url as string
}

// URL de paiement Pro avec l'identifiant anonyme accroché.
export async function getProUrl(): Promise<string> {
  try {
    const { userId } = await ensureSession()
    return `${STRIPE_PRO_LINK}?client_reference_id=${encodeURIComponent(userId)}`
  } catch {
    return STRIPE_PRO_LINK
  }
}
