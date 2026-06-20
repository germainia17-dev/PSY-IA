// Daily push notification — 20h UTC (cron scheduled).
// Envoie un push aux utilisateurs inactifs depuis plus de 24h pour maintenir la série.
// Utilise Expo Push API (pas d'authentification requise — c'est un endpoint public).

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

async function sendPush(pushToken: string): Promise<boolean> {
  const expoPushUrl = 'https://exp.host/--/api/v2/push/send'
  const res = await fetch(expoPushUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: pushToken,
      title: 'Comment tu te sens ?',
      body: 'Je suis là si tu veux parler.',
      sound: 'default',
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString())
    console.error(`Expo Push error: ${err}`)
    return false
  }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Récupère les utilisateurs inactifs depuis plus de 24h avec un push_token.
  const { data: targets, error } = await supabase
    .from('profiles')
    .select('user_id, push_token')
    .not('push_token', 'is', null)
    .filter(
      'last_message_at',
      'lt',
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    )
    .limit(1000)

  if (error) {
    console.error('Query error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!targets || targets.length === 0) {
    console.log('Aucun utilisateur à notifier ce soir.')
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  for (const target of targets) {
    if (target.push_token) {
      const ok = await sendPush(target.push_token)
      if (ok) sent++
    }
  }

  const result = { sent, total: targets.length }
  console.log('Daily push:', result)
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})
