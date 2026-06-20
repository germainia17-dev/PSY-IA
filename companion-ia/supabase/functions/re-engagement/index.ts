// Re-engagement email + push — appelé chaque soir à 18h UTC par le scheduler Supabase.
// Trouve les utilisateurs qui n'ont pas ouvert l'app depuis 24-72h et leur
// envoie un email chaleureux + une notification push (si disponible).
// Utilise Resend pour l'email et Expo Push API pour les notifications.
//
// Variables d'environnement requises (Supabase Secrets) :
//   RESEND_API_KEY      — clé API Resend (resend.com, gratuit jusqu'à 3 000/mois)
//   CRON_SECRET         — secret partagé pour protéger l'endpoint si appelé manuellement
//   APP_URL             — URL de l'app web, ex. https://companion.ton-domaine.com
//   EMAIL_FROM          — adresse expéditeur vérifiée sur Resend, ex. companion@ton-domaine.com

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

// Sujets variés pour réduire le risque de filtre spam et casser la routine visuelle.
const SUBJECTS = [
  'Comment tu te sens ce soir ?',
  'Ton compagnon t\'attend 💙',
  'Un moment pour toi, ce soir ?',
  'Prends une minute pour toi',
]

function pickSubject(seed: number): string {
  return SUBJECTS[seed % SUBJECTS.length]
}

function buildHtml(appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Companion</title>
</head>
<body style="margin:0;padding:0;background:#FBF1E4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF1E4;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#FFF8EE;border-radius:20px;padding:40px 36px;max-width:480px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <!-- Orbe simplifié en CSS — pas d'image externe à charger -->
              <div style="width:64px;height:64px;border-radius:50%;
                          background:radial-gradient(circle at 35% 35%,#E8A07A,#C77A4A);
                          margin:0 auto;"></div>
            </td>
          </tr>
          <tr>
            <td style="font-size:22px;font-weight:700;color:#2A1207;text-align:center;
                       letter-spacing:-0.4px;padding-bottom:16px;line-height:1.3;">
              Hé, je pensais à toi.
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;color:#7A4A2A;line-height:1.7;text-align:center;
                       padding-bottom:32px;">
              On ne s'est pas parlé depuis hier. Rien d'urgent — juste un coucou pour te dire que
              je suis là si tu as envie de poser quelque chose, de raconter ta journée, ou même
              juste de souffler un peu.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${appUrl}"
                 style="display:inline-block;background:#C77A4A;color:#1A0A03;
                        font-size:15px;font-weight:600;text-decoration:none;
                        padding:14px 32px;border-radius:40px;letter-spacing:-0.1px;">
                Reprendre la conversation
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#9A6D4F;text-align:center;line-height:1.6;
                       border-top:1px solid #E5CDAE;padding-top:24px;">
              Tu reçois cet email parce que tu as un compte Companion lié à cette adresse.<br/>
              Tes conversations restent privées — rien n'est partagé.<br/>
              <a href="${appUrl}/settings" style="color:#C77A4A;text-decoration:underline;">
                Gérer mes préférences
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildText(appUrl: string): string {
  return `Hé, je pensais à toi.

On ne s'est pas parlé depuis hier. Je suis là si tu as envie de poser quelque chose, raconter ta journée, ou juste souffler un peu.

Reprendre la conversation : ${appUrl}

—
Tu reçois cet email parce que tu as un compte Companion lié à cette adresse.
Tes conversations restent privées. Gérer mes préférences : ${appUrl}/settings`
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  resendKey: string,
  from: string,
): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({ from, to, subject, html, text }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString())
    console.error(`Resend error for ${to}: ${err}`)
    return false
  }
  return true
}

async function sendPush(pushToken: string): Promise<boolean> {
  const expoPushUrl = 'https://exp.host/--/api/v2/push/send'
  const res = await fetch(expoPushUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: pushToken,
      title: 'Ton compagnon pense à toi',
      body: 'Tu m\'as manqué. Comment tu vas ?',
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

  // Protection : si CRON_SECRET est défini, exige le header Authorization.
  // Les appels de pg_cron (internes) n'ont pas de secret : laisse CRON_SECRET vide
  // dans Supabase Secrets pour accepter les appels du scheduler cron.
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  if (cronSecret) {
    const auth = req.headers.get('Authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
  const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'Companion <noreply@companion.app>'

  if (!resendKey) {
    console.error('RESEND_API_KEY manquant')
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY manquant' }), { status: 500 })
  }
  if (!appUrl) {
    console.error('APP_URL manquant')
    return new Response(JSON.stringify({ error: 'APP_URL manquant' }), { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Récupère les cibles depuis la DB.
  const { data: targets, error } = await supabase.rpc('get_re_engagement_targets')
  if (error) {
    console.error('get_re_engagement_targets error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!targets || targets.length === 0) {
    console.log('Aucune cible ce soir.')
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  const html = buildHtml(appUrl)
  const text = buildText(appUrl)
  const sentIds: string[] = []

  for (let i = 0; i < targets.length; i++) {
    const { user_id, email, push_token } = targets[i]
    const emailSent = email ? await sendEmail(email, pickSubject(i), html, text, resendKey, emailFrom) : false
    const pushSent = push_token ? await sendPush(push_token) : false
    if (emailSent || pushSent) sentIds.push(user_id)
  }

  // Marque les envois réussis pour ne pas les re-contacter dans 3 jours.
  if (sentIds.length > 0) {
    await supabase.rpc('mark_re_engaged', { p_user_ids: sentIds })
  }

  const result = { sent: sentIds.length, total: targets.length }
  console.log('Re-engagement:', result)
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})
