-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Database Setup (Deals — Phase 4)
-- Run this AFTER supabase-deals-phase3-setup.sql.
--
-- Adds:
--   • deal_deliverables
--   • deliverable_submissions
-- with participant-scoped RLS for both parties on the parent deal.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. DEAL_DELIVERABLES
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.deal_deliverables (
  id                    uuid default gen_random_uuid() primary key,
  deal_id               uuid not null references public.deals(id) on delete cascade,
  title                 text not null,
  order_index           integer not null default 0,
  type                  text not null check (type in (
                          'instagram_post','tiktok_video','story',
                          'appearance_event','meetup','keynote','custom'
                        )) default 'custom',
  instructions          text not null default '',
  status                text not null check (status in (
                          'not_started','draft_submitted','under_review',
                          'revision_requested','approved','published','completed'
                        )) default 'not_started',
  due_at                timestamptz,
  draft_required        boolean not null default false,
  publish_required      boolean not null default false,
  proof_required        boolean not null default false,
  disclosure_required   boolean not null default false,
  revision_limit        integer not null default 0,
  revision_count_used   integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Backfill compatibility for pre-existing table variants.
alter table public.deal_deliverables
  add column if not exists order_index integer;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'deal_deliverables'
      and column_name = 'order'
  ) then
    execute '
      update public.deal_deliverables
      set order_index = coalesce(order_index, "order")
      where order_index is null
    ';
  end if;
end $$;

update public.deal_deliverables
set order_index = 0
where order_index is null;

alter table public.deal_deliverables
  alter column order_index set default 0;

alter table public.deal_deliverables
  alter column order_index set not null;

create index if not exists idx_deal_deliverables_deal_order
  on public.deal_deliverables(deal_id, order_index asc);

drop trigger if exists on_deal_deliverable_updated on public.deal_deliverables;
create trigger on_deal_deliverable_updated
  before update on public.deal_deliverables
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 2. DELIVERABLE_SUBMISSIONS
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.deliverable_submissions (
  id                      uuid default gen_random_uuid() primary key,
  deliverable_id          uuid not null references public.deal_deliverables(id) on delete cascade,
  deal_id                 uuid not null references public.deals(id) on delete cascade,
  version                 integer not null default 1,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  submitted_at            timestamptz not null default now(),
  submission_type         text not null check (submission_type in ('file','url','text','mixed')) default 'text',
  artifacts               jsonb not null default '[]'::jsonb,
  notes                   text not null default '',
  status                  text not null check (status in (
                            'submitted','viewed','approved','revision_requested','rejected'
                          )) default 'submitted',
  reviewed_by_profile_id  uuid references public.profiles(id) on delete set null,
  reviewed_at             timestamptz,
  feedback                text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint deliverable_submissions_deal_deliverable_uk unique (deliverable_id, version)
);

create index if not exists idx_deliverable_submissions_deliverable_created
  on public.deliverable_submissions(deliverable_id, created_at asc);

create index if not exists idx_deliverable_submissions_deal_created
  on public.deliverable_submissions(deal_id, created_at asc);

drop trigger if exists on_deliverable_submission_updated on public.deliverable_submissions;
create trigger on_deliverable_submission_updated
  before update on public.deliverable_submissions
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────
alter table public.deal_deliverables enable row level security;
alter table public.deliverable_submissions enable row level security;

drop policy if exists "Participants read deal deliverables" on public.deal_deliverables;
create policy "Participants read deal deliverables"
  on public.deal_deliverables for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  );

drop policy if exists "Participants write deal deliverables" on public.deal_deliverables;
create policy "Participants write deal deliverables"
  on public.deal_deliverables for all
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  )
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  );

drop policy if exists "Participants read deliverable submissions" on public.deliverable_submissions;
create policy "Participants read deliverable submissions"
  on public.deliverable_submissions for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  );

drop policy if exists "Participants write deliverable submissions" on public.deliverable_submissions;
create policy "Participants write deliverable submissions"
  on public.deliverable_submissions for all
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  )
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  );
