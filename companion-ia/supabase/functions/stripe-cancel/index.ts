// Résiliation immédiate de l'abonnement Stripe depuis l'app.
// JWT requis. Récupère le stripe_customer_id du profil, trouve l'abonnement
// actif, l'annule, puis appelle deactivate_pro pour downgrade immédiat.

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// CORS : l'app web (localhost / domaine) fait un préflight OPTIONS avant le POST.
// Sans ces headers, le navigateur bloque la requête et fetch throw côté client.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return json({ error: 'Non authentifié' }, 401)

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Session invalide' }, 401)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile?.stripe_customer_id) {
    return json({ error: 'Aucun abonnement actif trouvé.' }, 400)
  }

  try {
    // Trouve l'abonnement actif pour ce customer
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      // Pas d'abonnement actif — downgrade quand même au cas où
      await supabase.rpc('deactivate_pro', { p_stripe_customer_id: profile.stripe_customer_id })
      return json({ success: true }, 200)
    }

    // Annulation immédiate (pas en fin de période)
    await stripe.subscriptions.cancel(subscriptions.data[0].id)

    // Downgrade local immédiat sans attendre le webhook
    await supabase.rpc('deactivate_pro', { p_stripe_customer_id: profile.stripe_customer_id })

    console.log('Abonnement annulé pour customer', profile.stripe_customer_id)

    return json({ success: true }, 200)
  } catch (err) {
    console.error('Stripe cancel error:', err)
    return json({ error: 'Erreur Stripe' }, 500)
  }
})
