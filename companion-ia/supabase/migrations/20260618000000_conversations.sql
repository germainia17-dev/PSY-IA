-- Stockage cloud des conversations (sync multi-appareils).
-- JSONB pour messages : conversations lues/écrites en bloc, max 120 msgs enforced côté client.
create table public.conversations (
  id          text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null default 'Nouvelle conversation',
  preview     text        not null default '',
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  messages    jsonb       not null default '[]',
  primary key (id, user_id)
);

alter table public.conversations enable row level security;

create policy "own conversations"
  on public.conversations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
