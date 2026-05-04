-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Database Setup (Deals — Phase 1)
-- Run this in Supabase Dashboard → SQL Editor → New Query.
-- Depends on: supabase-setup.sql, supabase-business-setup.sql,
--             supabase-offers-setup.sql
--             (profiles, campaigns, applications, offers, handle_updated_at)
--
-- A "deal" is the working agreement that exists once an offer is
-- accepted. It freezes the offer terms (terms_snapshot) and tracks the
-- end-to-end fulfillment lifecycle: contracts, deliverables, submissions,
-- payments, and activity. Phase 1 lands the deal row only — child tables
-- (deliverables, submissions, deal_contracts, deal_payments,
-- deal_activities) arrive in subsequent phases.
--
-- Lifecycle (validated in app layer; DB CHECK enumerates allowed states):
--   created → contract_pending → active → submission_in_progress
--           → under_review → revision_requested → approved_completed
--           → payment_pending → paid → closed
--   plus terminal off-ramps: cancelled, disputed
--
-- Phase 1 is read-only at the API layer: deals are inserted by a future
-- system path (offer-acceptance trigger or service-role mutation). RLS
-- here exposes SELECT to brand and athlete participants only; writes are
-- intentionally not granted to client-side roles yet.
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. DEALS
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.deals (
  id                  uuid default gen_random_uuid() primary key,

  -- One deal per accepted offer. RESTRICT prevents an offer being
  -- deleted while a live deal references it.
  offer_id            uuid not null unique references public.offers(id) on delete restrict,

  -- Parties. Denormalized from offers for fast RLS predicates and so
  -- deletion of the source offer (only allowed when no deal exists)
  -- doesn't have to cascade through deals.
  brand_id            uuid not null references public.profiles(id) on delete cascade,
  athlete_id          uuid not null references public.profiles(id) on delete cascade,

  -- Optional links — copied from the originating offer at acceptance.
  campaign_id         uuid references public.campaigns(id)    on delete set null,
  application_id      uuid references public.applications(id) on delete set null,

  -- Chat thread that gave rise to the deal (chat_negotiated origin) or
  -- the application thread it descended from. Loose pointer for now —
  -- chat threads don't yet have a public table to FK into.
  chat_thread_id      uuid,

  -- Immutable snapshot of offer terms at acceptance time. The shape is
  -- DealTermsSnapshot (see src/lib/campaigns/deals/types.ts). Treated
  -- as opaque JSON in Postgres; the app layer must never mutate it
  -- after the deal is created.
  terms_snapshot      jsonb not null,

  -- Lifecycle.
  status              text not null check (status in (
                        'created','contract_pending','active',
                        'submission_in_progress','under_review',
                        'revision_requested','approved_completed',
                        'payment_pending','paid','closed',
                        'cancelled','disputed'
                      )) default 'created',

  -- Pointers to 1:1 child rows that haven't been modeled yet (Phase 4).
  -- Kept nullable + un-FK'd until those tables land so this migration
  -- is independent.
  contract_id         uuid,
  payment_id          uuid,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Indexes sized to the dashboards that read this table.
--   • Brand workspace: list own deals, freshest first.
create index if not exists idx_deals_brand_updated
  on public.deals(brand_id, updated_at desc);

--   • Athlete workspace: list own deals, freshest first.
create index if not exists idx_deals_athlete_updated
  on public.deals(athlete_id, updated_at desc);

--   • Status filter on brand inbox. Partial — most queries hit
--     active/in-progress deals, not terminal ones.
create index if not exists idx_deals_brand_status
  on public.deals(brand_id, status, updated_at desc)
  where status not in ('closed','cancelled','disputed');


-- ─────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────
drop trigger if exists on_deal_updated on public.deals;
create trigger on_deal_updated
  before update on public.deals
  for each row execute function public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- terms_snapshot immutability
-- The snapshot is a frozen copy of the offer at acceptance time. Once
-- the row exists, the snapshot must not change — it's the legal record
-- of what both parties agreed to. Reject UPDATEs that touch it.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.deals_block_terms_snapshot_change()
returns trigger
language plpgsql
as $$
begin
  if old.terms_snapshot is distinct from new.terms_snapshot then
    raise exception 'deals.terms_snapshot is immutable after deal creation';
  end if;
  return new;
end;
$$;

drop trigger if exists on_deal_terms_immutable on public.deals;
create trigger on_deal_terms_immutable
  before update on public.deals
  for each row execute function public.deals_block_terms_snapshot_change();


-- ─────────────────────────────────────────────────────────────────
-- RLS — Phase 1: SELECT-only for participants.
-- Brand and athlete on the deal can each read it. No client-side
-- writes; deal creation will land via a service-role path in Phase 2
-- (triggered by offer acceptance).
-- ─────────────────────────────────────────────────────────────────
alter table public.deals enable row level security;

drop policy if exists "Brands read own deals" on public.deals;
create policy "Brands read own deals"
  on public.deals for select
  using ((select auth.uid()) = brand_id);

drop policy if exists "Athletes read own deals" on public.deals;
create policy "Athletes read own deals"
  on public.deals for select
  using ((select auth.uid()) = athlete_id);

