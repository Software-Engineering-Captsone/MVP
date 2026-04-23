-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Chat Schema (threads, messages, participants, read state)
-- Run in Supabase Dashboard → SQL Editor → New Query
--
-- Model:
--   chat_threads         — 1:1 conversation between a brand and athlete,
--                          optionally linked to an application or campaign.
--                          thread_kind distinguishes brand outreach from
--                          post-approval coordination threads.
--   chat_participants    — denormalized display_name per user per thread
--                          (faster inbox renders than a join to profiles).
--   chat_messages        — user text, system notices, or offer-linked
--                          messages. offer_id references public.deals.
--   chat_thread_read_state — per-user last_read_at for unread counts.
--   chat_thread_last_message — view: most recent message per thread.
--
-- Security:
--   RLS is enabled on every table. Access is granted only to participants
--   of the thread (verified via chat_threads.brand_user_id/athlete_user_id).
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. CHAT_THREADS
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.chat_threads (
  id                uuid default gen_random_uuid() primary key,
  application_id    uuid references public.applications(id) on delete cascade,
  brand_user_id     uuid references public.profiles(id) on delete cascade not null,
  athlete_user_id   uuid references public.profiles(id) on delete cascade not null,
  thread_kind       text not null check (thread_kind in ('application_approved', 'brand_outreach')),
  campaign_id       uuid references public.campaigns(id) on delete set null,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Application-approved threads: at most one per application.
create unique index if not exists uniq_chat_threads_application
  on public.chat_threads(application_id)
  where thread_kind = 'application_approved' and application_id is not null;

-- Brand outreach threads: at most one per (brand, athlete) pair.
create unique index if not exists uniq_chat_threads_outreach_pair
  on public.chat_threads(brand_user_id, athlete_user_id)
  where thread_kind = 'brand_outreach';

create index if not exists idx_chat_threads_brand on public.chat_threads(brand_user_id);
create index if not exists idx_chat_threads_athlete on public.chat_threads(athlete_user_id);
create index if not exists idx_chat_threads_updated on public.chat_threads(updated_at desc);

alter table public.chat_threads enable row level security;

create policy "Participants view thread"
  on public.chat_threads for select
  using (auth.uid() in (brand_user_id, athlete_user_id));

create policy "Participants insert thread"
  on public.chat_threads for insert
  with check (auth.uid() in (brand_user_id, athlete_user_id));

create policy "Participants update thread"
  on public.chat_threads for update
  using (auth.uid() in (brand_user_id, athlete_user_id))
  with check (auth.uid() in (brand_user_id, athlete_user_id));

-- Touch updated_at on any column change.
create or replace function public.touch_chat_thread_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chat_threads_updated on public.chat_threads;
create trigger chat_threads_updated
  before update on public.chat_threads
  for each row execute procedure public.touch_chat_thread_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- 2. CHAT_PARTICIPANTS
-- ─────────────────────────────────────────────────────────────────
-- Denormalized display_name so the inbox can render counterpart labels
-- without joining profiles. Populated by the app on thread creation.
create table if not exists public.chat_participants (
  thread_id     uuid references public.chat_threads(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  display_name  text not null default '',
  created_at    timestamptz default now(),
  primary key (thread_id, user_id)
);

create index if not exists idx_chat_participants_user on public.chat_participants(user_id);

alter table public.chat_participants enable row level security;

create policy "Members see participants"
  on public.chat_participants for select
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and auth.uid() in (t.brand_user_id, t.athlete_user_id)
    )
  );

create policy "Members insert participants"
  on public.chat_participants for insert
  with check (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and auth.uid() in (t.brand_user_id, t.athlete_user_id)
    )
  );

create policy "Members update participants"
  on public.chat_participants for update
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and auth.uid() in (t.brand_user_id, t.athlete_user_id)
    )
  );


-- ─────────────────────────────────────────────────────────────────
-- 3. CHAT_MESSAGES
-- ─────────────────────────────────────────────────────────────────
-- message_kind:
--   'user'   — typed text from a participant
--   'system' — automated notice (e.g. "Application approved")
--   'offer'  — a deal offer surfaced in chat; offer_id → public.deals(id)
create table if not exists public.chat_messages (
  id             uuid default gen_random_uuid() primary key,
  thread_id      uuid references public.chat_threads(id) on delete cascade not null,
  from_user_id   uuid references public.profiles(id) on delete cascade not null,
  body           text not null default '',
  message_kind   text not null check (message_kind in ('user', 'system', 'offer')) default 'user',
  offer_id       uuid references public.deals(id) on delete set null,
  created_at     timestamptz default now()
);

create index if not exists idx_chat_messages_thread_created
  on public.chat_messages(thread_id, created_at);
create index if not exists idx_chat_messages_sender
  on public.chat_messages(from_user_id);

alter table public.chat_messages enable row level security;

create policy "Members read messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and auth.uid() in (t.brand_user_id, t.athlete_user_id)
    )
  );

create policy "Members send messages"
  on public.chat_messages for insert
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and auth.uid() in (t.brand_user_id, t.athlete_user_id)
    )
  );

-- Bump chat_threads.updated_at on each new message so inbox sort stays fresh.
create or replace function public.bump_chat_thread_on_message()
returns trigger language plpgsql as $$
begin
  update public.chat_threads
    set updated_at = new.created_at
    where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_bump_thread on public.chat_messages;
create trigger chat_messages_bump_thread
  after insert on public.chat_messages
  for each row execute procedure public.bump_chat_thread_on_message();


-- ─────────────────────────────────────────────────────────────────
-- 4. CHAT_THREAD_READ_STATE
-- ─────────────────────────────────────────────────────────────────
-- Per-user last_read_at timestamp per thread. Unread count =
-- messages after last_read_at from the other participant.
create table if not exists public.chat_thread_read_state (
  thread_id      uuid references public.chat_threads(id) on delete cascade not null,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  last_read_at   timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index if not exists idx_chat_read_state_user on public.chat_thread_read_state(user_id);

alter table public.chat_thread_read_state enable row level security;

create policy "Self read state"
  on public.chat_thread_read_state for select
  using (user_id = auth.uid());

create policy "Self upsert read state (insert)"
  on public.chat_thread_read_state for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and auth.uid() in (t.brand_user_id, t.athlete_user_id)
    )
  );

create policy "Self upsert read state (update)"
  on public.chat_thread_read_state for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────
-- 5. CHAT_THREAD_LAST_MESSAGE (view)
-- ─────────────────────────────────────────────────────────────────
-- Most recent message per thread. Used by inbox to show last-message
-- preview without fetching full message history for each thread.
-- Views inherit RLS from underlying tables — no extra policy needed.
create or replace view public.chat_thread_last_message as
  select distinct on (m.thread_id)
    m.thread_id,
    m.id          as message_id,
    m.from_user_id,
    m.body,
    m.message_kind,
    m.created_at
  from public.chat_messages m
  order by m.thread_id, m.created_at desc;
