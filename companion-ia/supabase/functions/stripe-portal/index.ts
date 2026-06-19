// Génère une session Stripe Customer Portal pour permettre à l'utilisateur
// de gérer ou résilier son abonnement. JWT requis (verify_jwt = true dans config.toml).
// Retourne une URL courte durée (24h) — ne jamais la cacher côté client.

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405 })
  }

  // Le JWT est vérifié par Supabase avant d'atteindre cette fonction.
  // On récupère l'user_id depuis l'Authorization header.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return new Response('Non authentifié', { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response('Session invalide', { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile?.stripe_customer_id) {
    return new Response(
      JSON.stringify({ error: 'Aucun abonnement actif trouvé.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    // Stripe exige HTTPS — on fallback sur l'app web déployée ou localhost en dev
    const returnUrl: string = body.return_url && body.return_url.startsWith('https://')
      ? body.return_url
      : 'https://companion-ia.vercel.app/settings'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    })

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Stripe portal error:', err)
    return new Response('Erreur Stripe', { status: 500 })
  }
})
