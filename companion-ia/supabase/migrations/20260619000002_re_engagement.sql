-- Re-engagement email : tracking du dernier envoi par utilisateur.
-- La colonne `last_re_engagement` évite de spammer : on n'envoie pas plus d'un
-- email toutes les 3 nuits pour un même compte.

alter table public.profiles
  add column if not exists last_re_engagement date;

-- Retourne les utilisateurs à re-engager ce soir.
-- Critères :
--   • compte lié (email vérifié dans auth.users)
--   • au moins une conversation cloud (pas de compte anonyme sans sync)
--   • dernière activité entre 24h et 72h (pas trop frais, pas trop dormant)
--   • pas déjà contacté dans les 3 derniers jours
-- SECURITY DEFINER + grant service_role only : cette fonction lit auth.users,
-- qui est inaccessible en dehors du service role.
create or replace function public.get_re_engagement_targets()
returns table(user_id uuid, email text, push_token text)
language sql
security definer
set search_path = public
as $$
  select distinct on (a.id)
    a.id as user_id,
    a.email,
    p.push_token
  from auth.users a
  join public.profiles p on p.user_id = a.id
  where
    -- email vérifié uniquement — pas de spam vers des boîtes non confirmées
    a.email is not null
    and a.email_confirmed_at is not null
    -- dernière conversation dans la fenêtre 24-72h
    and exists (
      select 1 from public.conversations c
      where c.user_id = a.id
        and c.updated_at < now() - interval '24 hours'
        and c.updated_at > now() - interval '72 hours'
    )
    -- pas contacté dans les 3 derniers jours
    and (
      p.last_re_engagement is null
      or p.last_re_engagement < (now() at time zone 'utc')::date - 3
    )
  limit 200
$$;

revoke all on function public.get_re_engagement_targets() from anon, authenticated;
grant execute on function public.get_re_engagement_targets() to service_role;

-- Marque un batch d'utilisateurs comme contactés aujourd'hui.
create or replace function public.mark_re_engaged(p_user_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set last_re_engagement = (now() at time zone 'utc')::date
  where user_id = any(p_user_ids)
$$;

revoke all on function public.mark_re_engaged(uuid[]) from anon, authenticated;
grant execute on function public.mark_re_engaged(uuid[]) to service_role;
