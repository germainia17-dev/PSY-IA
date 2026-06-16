-- Activation du plan Pro après paiement Stripe.
-- Appelée UNIQUEMENT par le webhook Stripe (service_role), jamais par le client :
-- un utilisateur ne doit pas pouvoir se passer Pro tout seul.

alter table public.profiles
  add column if not exists stripe_customer_id text;

-- Passe un utilisateur en Pro (idempotent : un webhook Stripe peut être rejoué).
-- SECURITY DEFINER + grant service_role only → écrit malgré la RLS, hors d'atteinte
-- des sessions anonymes.
create or replace function public.activate_pro(
  p_user_id uuid,
  p_stripe_customer_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, plan, stripe_customer_id)
  values (p_user_id, 'pro', p_stripe_customer_id)
  on conflict (user_id) do update
    set plan = 'pro',
        stripe_customer_id = coalesce(excluded.stripe_customer_id, profiles.stripe_customer_id);
end;
$$;

revoke all on function public.activate_pro(uuid, text) from anon, authenticated;
grant execute on function public.activate_pro(uuid, text) to service_role;
