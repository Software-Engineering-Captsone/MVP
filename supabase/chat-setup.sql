-- Chat tables + RLS for application-approved threads and brand outreach (Supabase Auth).
-- Run in Supabase SQL Editor or via migration tooling.
-- Idempotent upgrades: section 1 uses IF NOT EXISTS / safe ALTERs for existing projects.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Tables (new installs + additive columns for upgrades)
-- ---------------------------------------------------------------------------

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  application_id text,
  brand_user_id text not null,
  athlete_user_id text not null,
  thread_kind text not null default 'application_approved',
  campaign_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_threads add column if not exists thread_kind text;
alter table public.chat_threads add column if not exists campaign_id text;

-- Legacy installs: backfill thread_kind before enforcing NOT NULL.
update public.chat_threads
set thread_kind = coalesce(nullif(trim(thread_kind), ''), 'application_approved')
where thread_kind is null;

alter table public.chat_threads alter column thread_kind set default 'application_approved';
alter table public.chat_threads alter column thread_kind set not null;

alter table public.chat_threads alter column application_id drop not null;

alter table public.chat_threads drop constraint if exists chat_threads_application_id_key;
drop index if exists chat_threads_application_id_key;

create unique index if not exists chat_threads_application_id_uq
  on public.chat_threads (application_id)
  where application_id is not null;

create unique index if not exists chat_threads_brand_outreach_pair_uq
  on public.chat_threads (brand_user_id, athlete_user_id)
  where thread_kind = 'brand_outreach';

alter table public.chat_threads drop constraint if exists chat_threads_kind_chk;
alter table public.chat_threads add constraint chat_threads_kind_chk check (
  (thread_kind = 'application_approved' and application_id is not null)
  or
  (thread_kind = 'brand_outreach' and application_id is null)
);

create index if not exists chat_threads_updated_at_idx on public.chat_threads (updated_at desc);
create index if not exists chat_threads_brand_idx on public.chat_threads (brand_user_id);
create index if not exists chat_threads_athlete_idx on public.chat_threads (athlete_user_id);
create index if not exists chat_threads_kind_idx on public.chat_threads (thread_kind);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  from_user_id text not null,
  body text not null,
  message_kind text not null default 'user',
  offer_id text,
  created_at timestamptz not null default now()
);

alter table public.chat_messages add column if not exists message_kind text;
alter table public.chat_messages add column if not exists offer_id text;

update public.chat_messages
set message_kind = coalesce(nullif(trim(message_kind), ''), 'user')
where message_kind is null;

alter table public.chat_messages alter column message_kind set default 'user';
alter table public.chat_messages alter column message_kind set not null;

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at desc);

create table if not exists public.chat_participants (
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id text not null,
  display_name text not null default '',
  primary key (thread_id, user_id)
);

create index if not exists chat_participants_user_idx on public.chat_participants (user_id);

create table if not exists public.chat_thread_read_state (
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id text not null,
  last_read_at timestamptz,
  primary key (thread_id, user_id)
);

create or replace view public.chat_thread_last_message as
select distinct on (m.thread_id)
  m.thread_id,
  m.id as message_id,
  m.body,
  m.from_user_id,
  m.created_at
from public.chat_messages m
order by m.thread_id, m.created_at desc;

create or replace function public.bump_chat_thread_updated_at()
returns trigger
language plpgsql
as $$
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
  for each row
  execute function public.bump_chat_thread_updated_at();

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_thread_read_state enable row level security;

create or replace function public.chat_uid()
returns text
language sql
stable
as $$
  select auth.uid()::text;
$$;

-- Threads
drop policy if exists chat_threads_select on public.chat_threads;
create policy chat_threads_select on public.chat_threads for select
  using (
    brand_user_id = public.chat_uid()
    or athlete_user_id = public.chat_uid()
  );

drop policy if exists chat_threads_insert on public.chat_threads;
create policy chat_threads_insert on public.chat_threads for insert
  with check (
    (
      thread_kind = 'brand_outreach'
      and brand_user_id = public.chat_uid()
      and athlete_user_id is distinct from public.chat_uid()
    )
    or
    (
      thread_kind = 'application_approved'
      and application_id is not null
      and (brand_user_id = public.chat_uid() or athlete_user_id = public.chat_uid())
    )
  );

drop policy if exists chat_threads_update on public.chat_threads;
create policy chat_threads_update on public.chat_threads for update
  using (
    brand_user_id = public.chat_uid()
    or athlete_user_id = public.chat_uid()
  );

-- Participants
drop policy if exists chat_participants_select on public.chat_participants;
create policy chat_participants_select on public.chat_participants for select
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and (t.brand_user_id = public.chat_uid() or t.athlete_user_id = public.chat_uid())
    )
  );

drop policy if exists chat_participants_insert on public.chat_participants;
create policy chat_participants_insert on public.chat_participants for insert
  with check (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and user_id in (t.brand_user_id, t.athlete_user_id)
        and (t.brand_user_id = public.chat_uid() or t.athlete_user_id = public.chat_uid())
    )
  );

drop policy if exists chat_participants_update on public.chat_participants;
create policy chat_participants_update on public.chat_participants for update
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and (t.brand_user_id = public.chat_uid() or t.athlete_user_id = public.chat_uid())
    )
  );

-- Messages
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and (t.brand_user_id = public.chat_uid() or t.athlete_user_id = public.chat_uid())
    )
  );

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert
  with check (
    from_user_id = public.chat_uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and (t.brand_user_id = public.chat_uid() or t.athlete_user_id = public.chat_uid())
    )
  );

-- Read state
drop policy if exists chat_read_select on public.chat_thread_read_state;
create policy chat_read_select on public.chat_thread_read_state for select
  using (
    user_id = public.chat_uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and (t.brand_user_id = public.chat_uid() or t.athlete_user_id = public.chat_uid())
    )
  );

drop policy if exists chat_read_insert on public.chat_thread_read_state;
create policy chat_read_insert on public.chat_thread_read_state for insert
  with check (
    user_id = public.chat_uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and (t.brand_user_id = public.chat_uid() or t.athlete_user_id = public.chat_uid())
    )
  );

drop policy if exists chat_read_update on public.chat_thread_read_state;
create policy chat_read_update on public.chat_thread_read_state for update
  using (
    user_id = public.chat_uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and (t.brand_user_id = public.chat_uid() or t.athlete_user_id = public.chat_uid())
    )
  );

grant select on public.chat_thread_last_message to authenticated;

grant select, insert, update, delete on public.chat_threads to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant select, insert, update on public.chat_participants to authenticated;
grant select, insert, update on public.chat_thread_read_state to authenticated;

comment on table public.chat_threads is 'Chat threads: application_approved (linked application) or brand_outreach (brand-initiated).';
comment on column public.chat_threads.thread_kind is 'application_approved | brand_outreach';
comment on column public.chat_messages.message_kind is 'user | system | offer';
comment on column public.chat_thread_read_state.last_read_at is 'Null = never marked read; peer messages count as unread until set.';
