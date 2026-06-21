-- Suivi de santé fiable : une ligne par utilisateur et par jour.
-- mood / stress sur 1..5 (auto-éval ou sentiment de conversation), messages = nb
-- de messages utilisateur du jour. Remplace l'ancien score fabriqué côté client.

create table if not exists public.daily_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  mood smallint check (mood between 1 and 5),
  stress smallint check (stress between 1 and 5),
  messages int not null default 0,
  primary key (user_id, day)
);

alter table public.daily_metrics enable row level security;

create policy "read own metrics" on public.daily_metrics
  for select using (auth.uid() = user_id);

-- Upsert « merge » : ne jamais écraser une valeur existante par NULL, et
-- incrémenter le compteur de messages. SECURITY DEFINER : appelée par l'Edge
-- Function (sentiment) ou le client (humeur du jour) avec le JWT utilisateur.
create or replace function public.upsert_daily_metric(
  p_mood smallint default null,
  p_stress smallint default null,
  p_messages_delta int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;

  insert into daily_metrics (user_id, day, mood, stress, messages)
  values (
    v_user,
    (now() at time zone 'utc')::date,
    p_mood,
    p_stress,
    greatest(p_messages_delta, 0)
  )
  on conflict (user_id, day) do update set
    mood = coalesce(excluded.mood, daily_metrics.mood),
    stress = coalesce(excluded.stress, daily_metrics.stress),
    messages = daily_metrics.messages + greatest(p_messages_delta, 0);
end;
$$;

revoke all on function public.upsert_daily_metric from anon;
grant execute on function public.upsert_daily_metric to authenticated;
