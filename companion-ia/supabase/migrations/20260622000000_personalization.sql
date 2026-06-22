-- Personnalisation design (UX/UI) synchronisée : thème, accent, ton.
-- Stockée en JSONB sur le profil pour suivre l'utilisateur entre appareils.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personalization jsonb;

-- La table profiles n'avait qu'une policy SELECT : les écritures client
-- (push_token, personnalisation) étaient silencieusement bloquées par la RLS.
-- On autorise chacun à écrire SON profil. `with check` empêche d'écrire celui
-- d'un autre. Idempotent via le bloc DO (create policy ne supporte pas IF NOT EXISTS).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'update own profile'
  ) then
    create policy "update own profile" on public.profiles
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'insert own profile'
  ) then
    create policy "insert own profile" on public.profiles
      for insert with check (auth.uid() = user_id);
  end if;
end $$;
