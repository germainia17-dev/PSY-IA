-- FIX SÉCURITÉ : activate_pro était exécutable par anon/authenticated via le
-- grant EXECUTE par défaut à PUBLIC (que `revoke ... from anon, authenticated`
-- ne retire pas). Conséquence : n'importe quel utilisateur pouvait s'activer Pro
-- gratuitement en appelant la RPC avec son propre user_id (la fonction étant
-- SECURITY DEFINER, elle écrit malgré la RLS).
--
-- On retire le droit à PUBLIC (donc à anon et authenticated, qui en héritent) et
-- on ne le rouvre qu'à service_role — le webhook Stripe est le seul appelant.

revoke all on function public.activate_pro(uuid, text) from public;
revoke all on function public.activate_pro(uuid, text) from anon, authenticated;
grant execute on function public.activate_pro(uuid, text) to service_role;
