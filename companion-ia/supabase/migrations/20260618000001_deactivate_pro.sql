-- Downgrade un user Pro vers Free après résiliation Stripe.
-- Appelé par le webhook stripe-webhook sur event customer.subscription.deleted.
-- security definer + revoke public : seul service_role peut l'exécuter.
create or replace function public.deactivate_pro(p_stripe_customer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set plan = 'free'
  where stripe_customer_id = p_stripe_customer_id;
end;
$$;

revoke all on function public.deactivate_pro(text) from public, anon, authenticated;
grant execute on function public.deactivate_pro(text) to service_role;
