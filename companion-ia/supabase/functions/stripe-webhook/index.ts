// Webhook Stripe → activation du plan Pro.
// Stripe appelle cette fonction après un paiement réussi. On vérifie la signature
// (sinon n'importe qui pourrait se faire passer Pro en POSTant ici), on lit le
// client_reference_id (= user_id Supabase, accroché au lien dans api.ts) et on
// active le Pro via la RPC activate_pro (service_role, écrit malgré la RLS).
//
// Pas de JWT ici (verify_jwt = false dans config.toml) : Stripe ne s'authentifie
// pas avec un token utilisateur, mais avec sa signature HMAC.

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})
// En Deno, la vérification de signature doit passer par la Web Crypto API.
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  // Service role : seul moyen d'écrire le plan d'un user sans son JWT.
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

function looksLikeUuid(v: unknown): v is string {
  return typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405 })
  }

  const signature = req.headers.get('Stripe-Signature')
  if (!signature) {
    return new Response('Signature manquante', { status: 400 })
  }

  // Corps BRUT obligatoire : la signature est calculée sur les octets exacts.
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    )
  } catch (err) {
    console.error('Signature Stripe invalide:', err instanceof Error ? err.message : err)
    return new Response('Signature invalide', { status: 400 })
  }

  try {
    // Paiement unique (offre à vie) OU 1er paiement d'abonnement : les deux
    // déclenchent checkout.session.completed avec le client_reference_id.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id

      // Le paiement doit être réellement abouti (un mode 'subscription' peut être
      // 'unpaid' tant que la 1re facture n'est pas réglée).
      const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'

      if (!looksLikeUuid(userId)) {
        // Pas d'identifiant exploitable : on accuse réception pour que Stripe
        // arrête de rejouer, mais on log pour pouvoir réconcilier à la main.
        console.error('checkout.session.completed sans client_reference_id valide:', session.id)
        return new Response(JSON.stringify({ received: true, skipped: 'no_user' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (paid) {
        const customerId = typeof session.customer === 'string' ? session.customer : null
        const { error } = await supabase.rpc('activate_pro', {
          p_user_id: userId,
          p_stripe_customer_id: customerId,
        })
        if (error) {
          // On renvoie 500 → Stripe rejouera le webhook (l'activation finira par passer).
          console.error('activate_pro a échoué:', error)
          return new Response('Activation échouée', { status: 500 })
        }
        console.log('Pro activé pour', userId, 'session', session.id)
      }
    }

    // Abonnement résilié : downgrade immédiat vers Free.
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : null

      if (customerId) {
        const { error } = await supabase.rpc('deactivate_pro', {
          p_stripe_customer_id: customerId,
        })
        if (error) {
          console.error('deactivate_pro a échoué:', error)
          return new Response('Désactivation échouée', { status: 500 })
        }
        console.log('Pro désactivé pour customer', customerId)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Erreur traitement webhook:', err)
    return new Response('Erreur interne', { status: 500 })
  }
})
