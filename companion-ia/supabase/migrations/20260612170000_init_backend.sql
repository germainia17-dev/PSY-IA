-- PSY-IA backend: profils, quota journalier, RLS.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  companion_name text not null default 'Companion',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = user_id);

create table if not exists public.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.usage_daily enable row level security;

create policy "read own usage" on public.usage_daily
  for select using (auth.uid() = user_id);

-- Incrément atomique du quota. Retourne le nombre de messages restants,
-- ou -1 si la limite est atteinte. SECURITY DEFINER : appelée par l'Edge
-- Function avec le JWT de l'utilisateur, écrit malgré la RLS.
create or replace function public.consume_message(p_daily_limit int default 10)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_plan text;
  v_count int;
begin
  if v_user is null then
    return -1;
  end if;

  insert into profiles (user_id) values (v_user)
  on conflict (user_id) do nothing;

  select plan into v_plan from profiles where user_id = v_user;

  -- Pro : illimité
  if v_plan = 'pro' then
    return 999999;
  end if;

  insert into usage_daily (user_id, day, count)
  values (v_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set count = usage_daily.count + 1
  returning count into v_count;

  if v_count > p_daily_limit then
    return -1;
  end if;

  return p_daily_limit - v_count;
end;
$$;

revoke all on function public.consume_message from anon;
grant execute on function public.consume_message to authenticated;

-- Rembourse un message quand tous les providers ont échoué (l'utilisateur
-- ne doit pas payer pour une réponse qu'il n'a pas reçue).
create or replace function public.refund_message()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update usage_daily
  set count = greatest(count - 1, 0)
  where user_id = auth.uid()
    and day = (now() at time zone 'utc')::date;
end;
$$;

revoke all on function public.refund_message from anon;
grant execute on function public.refund_message to authenticated;
