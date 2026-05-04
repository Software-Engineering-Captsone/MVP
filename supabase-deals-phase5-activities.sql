-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Database Setup (Deals — Phase 5: Activities)
-- Run this AFTER supabase-deals-phase4-setup.sql.
--
-- Append-only audit trail for deal lifecycle; exposed on deal detail API.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.deal_activities (
  id            uuid default gen_random_uuid() primary key,
  deal_id       uuid not null references public.deals(id) on delete cascade,
  entity_type   text not null check (entity_type in ('deal', 'deliverable', 'submission')),
  entity_id     uuid not null,
  actor_type    text not null check (actor_type in ('business', 'athlete', 'system')),
  actor_id      uuid references public.profiles(id) on delete set null,
  event_type    text not null check (event_type in (
                  'deal_created',
                  'contract_uploaded',
                  'contract_signed',
                  'submission_submitted',
                  'revision_requested',
                  'submission_approved',
                  'deliverable_completed',
                  'deal_completed',
                  'payment_status_changed',
                  'payment_pending',
                  'payment_paid',
                  'deal_revision_blocked'
                )),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_deal_activities_deal_created
  on public.deal_activities(deal_id, created_at asc);

alter table public.deal_activities enable row level security;

drop policy if exists "Participants read deal activities" on public.deal_activities;
create policy "Participants read deal activities"
  on public.deal_activities for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  );

drop policy if exists "Participants insert deal activities" on public.deal_activities;
create policy "Participants insert deal activities"
  on public.deal_activities for insert
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  );
