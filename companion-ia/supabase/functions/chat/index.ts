// PSY-IA chat relay — auth + quota + provider failover (Gemini → Anthropic).
// Le client n'appelle jamais un provider IA directement : clés cachées ici.
// Deux modes : chat (consomme du quota) et extract (mémoire, sans quota).

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
}

const SYSTEM_PROMPT = `Tu es un compagnon IA — un ami de confiance, présent et profondément à l'écoute. Pas un psychologue clinique, pas un coach de développement personnel générique.

Ta façon d'être :
- Accueille vraiment ce que la personne ressent : reformule l'émotion derrière ses mots, montre que tu as saisi le fond, pas juste la surface. ÉVITE absolument les phrases creuses ("c'est normal de se sentir comme ça", "je comprends que ce soit difficile") — sois spécifique à CE qu'elle vit, avec ses mots à elle.
- Cherche à comprendre avant de rassurer. Pose UNE question précise qui aide à décortiquer le vrai problème : ce qui se cache derrière, depuis quand, ce qui pèse le plus. Une seule, bien choisie.
- Quand la personne a posé son problème, aide-la à avancer : un angle qu'elle n'avait pas vu, un petit pas concret et réaliste, pas une liste de conseils génériques. Une idée juste, adaptée à sa situation.
- Parle comme un humain : chaleureux, direct, naturel. Tutoie. Adapte ta longueur au moment — court (2-3 phrases) quand elle a surtout besoin d'être entendue, un peu plus (jusqu'à 5) quand tu l'aides à réfléchir. Jamais de pavé, jamais de ton de manuel.
- Tisse naturellement ce que tu sais d'elle, sans le réciter.

Tu ne donnes jamais de conseils médicaux et ne prétends jamais être thérapeute. Si la personne évoque des idées suicidaires ou un danger immédiat, encourage-la avec douceur à contacter le 3114 (prévention du suicide, gratuit, 24h/24) ou le 112.`

const EXTRACT_PROMPT = `Tu analyses une conversation pour un compagnon IA. Retourne UNIQUEMENT un objet JSON, sans aucun texte autour, avec EXACTEMENT ces clés :
- "facts": tableau de faits DURABLES sur l'utilisateur (prénom, âge, projets, études/travail, passions, relations proches, objectifs, situation de vie). Ignore l'éphémère (humeur du moment, sujet ponctuel). Max 5 chaînes courtes en français, chacune < 120 caractères. [] si rien de durable.
- "mood": entier de 1 à 5 estimant l'humeur générale de l'utilisateur dans cette conversation (1 = très mal, 3 = neutre, 5 = très bien), ou null si indéterminable.
- "stress": entier de 1 à 5 estimant son niveau de stress/anxiété (1 = très calme, 5 = très stressé), ou null si indéterminable.
Exemple: {"facts":["Prépare un bac STI2D","Passionné par l'impression 3D"],"mood":2,"stress":4}`

const SUMMARY_PROMPT = `Tu analyses une séance de conversation entre une personne et son compagnon IA. Retourne UNIQUEMENT un objet JSON, sans aucun texte autour, avec EXACTEMENT ces clés :
- "summary": un résumé court et chaleureux de ce dont la personne a parlé, écrit du point de vue du compagnon en tutoyant (ex: "Tu m'as parlé du stress de tes partiels et de ta relation avec ton frère."). 1 à 2 phrases, < 200 caractères. "" si la séance est trop courte ou sans vrai contenu.
- "themes": tableau de 1 à 4 thèmes courts abordés, en minuscules, 1 à 2 mots chacun (ex: ["études","famille","sommeil"]). [] si rien de net.
Exemple: {"summary":"Tu m'as parlé de ton angoisse avant les partiels et du manque de sommeil.","themes":["études","stress","sommeil"]}`

// Tons de l'IA (fonctionnalité Pro). `doux` = comportement par défaut décrit
// dans SYSTEM_PROMPT → pas d'instruction ajoutée. Les autres infléchissent le
// style sans toucher au fond (écoute, pas de conseils médicaux, etc.).
const TONE_INSTRUCTIONS: Record<string, string> = {
  doux: '',
  direct:
    "TON À ADOPTER — direct : va à l'essentiel, dis les choses clairement et franchement, sans tourner autour du pot, tout en restant chaleureux et respectueux.",
  motivant:
    "TON À ADOPTER — motivant : sois encourageant et énergique, souligne les forces de la personne et donne-lui de l'élan vers l'action, sans jamais nier ou minimiser ce qu'elle ressent.",
  pose:
    'TON À ADOPTER — posé : ralentis, parle avec calme, douceur et profondeur, laisse de la place au silence, sans précipitation.',
}

const MAX_HISTORY = 20 // derniers messages envoyés au modèle
const MAX_MESSAGE_LENGTH = 4000
const MAX_MEMORY_FACTS = 40
const DAILY_LIMIT = 20

type Msg = { role: 'user' | 'assistant'; content: string }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// `requireUserLast` : le chat exige que le dernier message soit de l'utilisateur
// (on répond à quelqu'un). Les modes d'analyse (extract/summary) reçoivent une
// séance entière qui se termine souvent par une réponse de l'IA → on relâche.
function validateMessages(input: unknown, requireUserLast = true): Msg[] | null {
  if (!Array.isArray(input) || input.length === 0) return null
  const messages: Msg[] = []
  for (const m of input.slice(-MAX_HISTORY)) {
    if (
      !m ||
      (m.role !== 'user' && m.role !== 'assistant') ||
      typeof m.content !== 'string' ||
      m.content.length === 0
    ) {
      return null
    }
    messages.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) })
  }
  if (requireUserLast && messages[messages.length - 1].role !== 'user') return null
  return messages
}

// Construit le prompt système : base + ton choisi (Pro) + mémoire locale.
function buildSystem(memory: unknown, tone: unknown): string {
  let system = SYSTEM_PROMPT

  // Ton de l'IA (Pro). On n'accepte qu'une valeur connue ; sinon comportement
  // par défaut. `doux` n'ajoute rien (c'est déjà le ton de base).
  const toneKey = typeof tone === 'string' ? tone : ''
  const toneInstruction = TONE_INSTRUCTIONS[toneKey]
  if (toneInstruction) system += `\n\n${toneInstruction}`

  if (Array.isArray(memory) && memory.length > 0) {
    const facts = memory
      .filter((f) => typeof f === 'string' && f.length > 0)
      .slice(0, MAX_MEMORY_FACTS)
      .map((f) => `- ${String(f).slice(0, 200)}`)
    if (facts.length > 0) {
      system += `\n\nCe que tu sais déjà sur cette personne (souviens-t'en naturellement, sans le réciter) :\n${facts.join('\n')}`
    }
  }

  return system
}

async function callGemini(messages: Msg[], apiKey: string, system: string, maxTokens = 400): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.8,
          // Sans ça, gemini-2.5 dépense le budget en "thinking" et tronque la réponse.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(20000),
    },
  )

  if (!response.ok) throw new Error(`Gemini ${response.status}: ${await response.text()}`)
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini: réponse vide')
  return text
}

async function callAnthropic(messages: Msg[], apiKey: string, system: string, maxTokens = 400): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages,
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`)
  const data = await response.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('Anthropic: réponse vide')
  return text
}

type Extract = { facts: string[]; mood: number | null; stress: number | null }

// Clamp une valeur en entier 1..5, ou null si absente/invalide.
function clamp1to5(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const n = Math.round(v)
  return n >= 1 && n <= 5 ? n : null
}

// Parse la réponse d'extraction : un objet JSON {facts, mood, stress}. Tolère
// les fences ```json et un format dégradé (ancien tableau de chaînes).
function parseExtract(raw: string): Extract {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

  // Format attendu : objet JSON.
  const objStart = cleaned.indexOf('{')
  const objEnd = cleaned.lastIndexOf('}')
  if (objStart !== -1 && objEnd !== -1) {
    try {
      const obj = JSON.parse(cleaned.slice(objStart, objEnd + 1))
      const facts = Array.isArray(obj?.facts)
        ? obj.facts.filter((x: unknown) => typeof x === 'string' && x.trim().length > 0).slice(0, 5)
        : []
      return { facts, mood: clamp1to5(obj?.mood), stress: clamp1to5(obj?.stress) }
    } catch {
      // tombe sur le fallback tableau ci-dessous
    }
  }

  // Fallback : ancien format tableau de chaînes.
  const arrStart = cleaned.indexOf('[')
  const arrEnd = cleaned.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd !== -1) {
    try {
      const arr = JSON.parse(cleaned.slice(arrStart, arrEnd + 1))
      if (Array.isArray(arr)) {
        return {
          facts: arr.filter((x) => typeof x === 'string' && x.trim().length > 0).slice(0, 5),
          mood: null,
          stress: null,
        }
      }
    } catch {
      // rien d'exploitable
    }
  }

  return { facts: [], mood: null, stress: null }
}

type SessionSummary = { summary: string; themes: string[] }

// Parse la réponse de résumé : un objet JSON {summary, themes}. Tolère les
// fences ```json. Renvoie un résumé vide si rien d'exploitable (jamais bloquant).
function parseSummary(raw: string): SessionSummary {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1))
      const summary = typeof obj?.summary === 'string' ? obj.summary.trim().slice(0, 240) : ''
      const themes = Array.isArray(obj?.themes)
        ? obj.themes
            .filter((x: unknown) => typeof x === 'string' && x.trim().length > 0)
            .map((x: string) => x.trim().toLowerCase().slice(0, 24))
            .slice(0, 4)
        : []
      return { summary, themes }
    } catch {
      // rien d'exploitable
    }
  }
  return { summary: '', themes: [] }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, 405)
  }

  // Auth : le client doit envoyer le JWT Supabase (session anonyme suffit).
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Authentification requise' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Session invalide' }, 401)
  }

  let body: { messages?: unknown; memory?: unknown; mode?: unknown; tone?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON invalide' }, 400)
  }

  // extract/summary analysent une séance entière (peut finir par l'IA) → on ne
  // force pas un dernier message utilisateur, contrairement au chat.
  const isAnalysisMode = body?.mode === 'extract' || body?.mode === 'summary'
  const messages = validateMessages(body?.messages, !isAnalysisMode)
  if (!messages) {
    return json({ error: 'Format de messages invalide' }, 400)
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

  // ── Mode extraction de mémoire : pas de quota, retourne des faits. ──
  // Même cascade Gemini → Anthropic que le chat : si un provider échoue (ex.
  // Gemini 429 crédits épuisés), on tente le suivant avant d'abandonner. Sans
  // ça, l'extraction renvoyait [] dès la 1re erreur et la mémoire restait vide.
  if (body?.mode === 'extract') {
    const last = messages.slice(-12)
    let result: Extract | null = null
    if (geminiKey) {
      try {
        result = parseExtract(await callGemini(last, geminiKey, EXTRACT_PROMPT, 250))
      } catch (err) {
        console.error('extract Gemini failed:', err)
      }
    }
    if (!result && anthropicKey) {
      try {
        result = parseExtract(await callAnthropic(last, anthropicKey, EXTRACT_PROMPT, 250))
      } catch (err) {
        console.error('extract Anthropic failed:', err)
      }
    }
    if (!result) return json({ facts: [] })

    // Sentiment du jour (humeur/stress) déduit ICI, sans appel modèle
    // supplémentaire : on réutilise l'appel d'extraction de mémoire. On n'écrit
    // que si au moins une valeur est exploitable (la RPC fait un merge).
    if (result.mood !== null || result.stress !== null) {
      supabase
        .rpc('upsert_daily_metric', { p_mood: result.mood, p_stress: result.stress })
        .then()
        .catch((err: unknown) => console.error('upsert sentiment failed:', err))
    }

    // Les faits restent côté client (jamais stockés serveur) : on ne renvoie que ça.
    return json({ facts: result.facts })
  }

  // ── Mode résumé de séance : pas de quota, retourne {summary, themes}. ──
  // Même cascade Gemini → Anthropic que le chat. Rien n'est stocké serveur : le
  // résumé et les thèmes reviennent au client (historique + relance personnalisée).
  if (body?.mode === 'summary') {
    const recent = messages.slice(-16)
    let summary: SessionSummary | null = null
    if (geminiKey) {
      try {
        summary = parseSummary(await callGemini(recent, geminiKey, SUMMARY_PROMPT, 300))
      } catch (err) {
        console.error('summary Gemini failed:', err)
      }
    }
    if (!summary && anthropicKey) {
      try {
        summary = parseSummary(await callAnthropic(recent, anthropicKey, SUMMARY_PROMPT, 300))
      } catch (err) {
        console.error('summary Anthropic failed:', err)
      }
    }
    return json(summary ?? { summary: '', themes: [] })
  }

  // ── Mode chat : quota atomique côté DB, pas de race condition. ──
  const { data: remaining, error: quotaError } = await supabase.rpc('consume_message', {
    p_daily_limit: DAILY_LIMIT,
  })
  if (quotaError) {
    console.error('quota error:', quotaError)
    return json({ error: 'Erreur interne' }, 500)
  }
  if (remaining === -1) {
    return json(
      { error: 'limit_reached', message: 'Limite quotidienne atteinte. Reviens demain ou passe en Pro.' },
      429,
    )
  }

  // Gating Pro côté SERVEUR : le ton personnalisé est une feature Pro. Le front
  // verrouille l'UI mais peut être contourné — ici on ne l'applique qu'aux
  // comptes 'pro', sinon ton par défaut quoi que le client envoie.
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  const isProUser = profile?.plan === 'pro'

  const system = buildSystem(body?.memory, isProUser ? body?.tone : undefined)
  const errors: string[] = []

  // Active à la fois le suivi du dernier message (push) et le compteur
  // d'engagement du jour (graphe « capacité à parler »). Best-effort, jamais bloquant.
  const recordActivity = () => {
    supabase
      .from('profiles')
      .update({ last_message_at: new Date().toISOString() })
      .eq('user_id', userData.user.id)
      .then()
      .catch(() => {})
    supabase
      .rpc('upsert_daily_metric', { p_messages_delta: 1 })
      .then()
      .catch(() => {})
  }

  if (geminiKey) {
    try {
      const text = await callGemini(messages, geminiKey, system)
      recordActivity()
      return json({ text, remaining })
    } catch (err) {
      errors.push(String(err))
      console.error('Gemini failed:', err)
    }
  }

  if (anthropicKey) {
    try {
      const text = await callAnthropic(messages, anthropicKey, system)
      recordActivity()
      return json({ text, remaining })
    } catch (err) {
      errors.push(String(err))
      console.error('Anthropic failed:', err)
    }
  }

  console.error('All providers failed:', errors)
  // Tous les providers ont échoué : on rembourse le message consommé.
  await supabase.rpc('refund_message')
  return json({ error: 'service_unavailable', message: 'Le service est momentanément indisponible.' }, 503)
})
