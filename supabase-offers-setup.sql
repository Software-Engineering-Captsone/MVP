-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Database Setup (Offers)
-- Run this in Supabase Dashboard → SQL Editor → New Query.
-- Depends on: supabase-setup.sql, supabase-business-setup.sql
--             (profiles, campaigns, applications, deals, handle_updated_at)
--
-- An "offer" is the brand's formal proposal to an athlete. Three origins:
--   • direct_profile     — brand opens athlete's profile and sends terms.
--   • campaign_handoff   — brand approves an application and drafts terms
--                          carrying campaign_id + application_id.
--   • chat_negotiated    — terms hammered out in DMs first, then drafted.
--
-- Lifecycle: draft → sent → (accepted | declined | withdrawn).
-- Only when status='accepted' do we materialize a row in deals (later step).
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. OFFERS
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.offers (
  id                    uuid default gen_random_uuid() primary key,

  -- Parties
  brand_id              uuid not null references public.profiles(id) on delete cascade,
  athlete_id            uuid not null references public.profiles(id) on delete cascade,

  -- Optional links — set when the offer descends from a campaign/application
  -- or is paired with an in-flight chat thread.
  campaign_id           uuid references public.campaigns(id)         on delete set null,
  application_id        uuid references public.applications(id)      on delete set null,
  deal_id               uuid, -- FK added later (Step 7) once deals workflow is live

  -- Provenance
  offer_origin          text not null check (offer_origin in (
                          'direct_profile','campaign_handoff','chat_negotiated'
                        )) default 'direct_profile',

  -- Lifecycle
  status                text not null check (status in (
                          'draft','sent','accepted','declined','withdrawn'
                        )) default 'draft',

  -- Free-form terms blob produced by the OfferWizard.
  -- Validated at the application layer; Postgres treats it as opaque JSON.
  structured_draft      jsonb not null default '{}'::jsonb,

  -- Brand-authored note shown to the athlete alongside the offer.
  notes                 text default '',

  -- Decline metadata (athlete-supplied)
  decline_reason        text default '',
  decline_note          text default '',

  -- Timeline stamps
  sent_at               timestamptz,
  accepted_at           timestamptz,
  declined_at           timestamptz,
  withdrawn_at          timestamptz,

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Indexes sized to real query patterns:
--   • Brand inbox: list own offers, freshest first.
create index if not exists idx_offers_brand_created
  on public.offers(brand_id, created_at desc);

--   • Athlete inbox: list offers received, freshest first. Drafts excluded
--     because they aren't visible to athletes yet.
create index if not exists idx_offers_athlete_visible
  on public.offers(athlete_id, created_at desc)
  where status <> 'draft';

--   • Campaign drilldown: "all offers issued from this campaign".
create index if not exists idx_offers_campaign
  on public.offers(campaign_id)
  where campaign_id is not null;

--   • Application drilldown: there should be at most one offer per application.
create unique index if not exists ux_offers_application
  on public.offers(application_id)
  where application_id is not null;


-- ─────────────────────────────────────────────────────────────────
-- Role enforcement: brand_id must point to a 'brand' profile,
-- athlete_id must point to an 'athlete' profile.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.verify_offer_party_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.brand_id and p.role = 'brand'
  ) then
    raise exception 'offers.brand_id must reference a profile with role=brand';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = new.athlete_id and p.role = 'athlete'
  ) then
    raise exception 'offers.athlete_id must reference a profile with role=athlete';
  end if;
  return new;
end;
$$;

drop trigger if exists offers_verify_roles on public.offers;
create trigger offers_verify_roles
  before insert or update on public.offers
  for each row execute function public.verify_offer_party_roles();


-- ─────────────────────────────────────────────────────────────────
-- Provenance consistency:
--   • campaign_handoff requires both campaign_id AND application_id.
--   • direct_profile must NOT carry a campaign_id or application_id.
--   • chat_negotiated may carry neither (terms negotiated freeform).
-- ─────────────────────────────────────────────────────────────────
create or replace function public.validate_offer_origin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.offer_origin = 'campaign_handoff' then
    if new.campaign_id is null or new.application_id is null then
      raise exception 'campaign_handoff offers require campaign_id and application_id';
    end if;
  elsif new.offer_origin = 'direct_profile' then
    if new.campaign_id is not null or new.application_id is not null then
      raise exception 'direct_profile offers cannot carry campaign_id or application_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists offers_validate_origin on public.offers;
create trigger offers_validate_origin
  before insert or update on public.offers
  for each row execute function public.validate_offer_origin();


-- ─────────────────────────────────────────────────────────────────
-- State machine + immutables + auto-stamping.
-- Allowed transitions:
--   draft     → sent | withdrawn
--   sent      → accepted | declined | withdrawn
--   accepted  → (terminal)
--   declined  → (terminal)
--   withdrawn → (terminal)
-- Once 'accepted', structured_draft is frozen (terms become the deal snapshot).
-- ─────────────────────────────────────────────────────────────────
create or replace function public.enforce_offer_transitions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  terminal constant text[] := array['accepted','declined','withdrawn'];
begin
  -- Immutable identity fields
  if old.brand_id is distinct from new.brand_id then
    raise exception 'offers.brand_id is immutable';
  end if;
  if old.athlete_id is distinct from new.athlete_id then
    raise exception 'offers.athlete_id is immutable';
  end if;
  if old.offer_origin is distinct from new.offer_origin then
    raise exception 'offers.offer_origin is immutable';
  end if;

  -- Terms freeze once accepted
  if old.status = 'accepted'
     and old.structured_draft is distinct from new.structured_draft then
    raise exception 'Cannot mutate terms of an accepted offer';
  end if;

  if old.status is distinct from new.status then
    if old.status = any(terminal) then
      raise exception 'Cannot change status of a % offer', old.status;
    end if;

    -- Allowed transitions
    if old.status = 'draft' and new.status not in ('sent','withdrawn') then
      raise exception 'Invalid transition draft → %', new.status;
    end if;
    if old.status = 'sent' and new.status not in ('accepted','declined','withdrawn') then
      raise exception 'Invalid transition sent → %', new.status;
    end if;

    -- Auto-stamp transition timestamps
    if new.status = 'sent'      and new.sent_at      is null then new.sent_at      := now(); end if;
    if new.status = 'accepted'  and new.accepted_at  is null then new.accepted_at  := now(); end if;
    if new.status = 'declined'  and new.declined_at  is null then new.declined_at  := now(); end if;
    if new.status = 'withdrawn' and new.withdrawn_at is null then new.withdrawn_at := now(); end if;
  end if;

  return new;
end;
$$;

drop trigger if exists offers_enforce_transitions on public.offers;
create trigger offers_enforce_transitions
  before update on public.offers
  for each row execute function public.enforce_offer_transitions();


-- updated_at maintained by the shared trigger function
drop trigger if exists on_offer_updated on public.offers;
create trigger on_offer_updated
  before update on public.offers
  for each row execute procedure public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- RLS
-- Brand: full lifecycle except 'accepted' (athlete-only outcome).
-- Athlete: read offers addressed to them (excluding drafts), and
--          only flip status to 'accepted' or 'declined'.
-- ─────────────────────────────────────────────────────────────────
alter table public.offers enable row level security;

-- Brand: read own offers (any status, including drafts).
drop policy if exists "Brands read own offers" on public.offers;
create policy "Brands read own offers"
  on public.offers for select
  using ((select auth.uid()) = brand_id);

-- Brand: insert offers they own.
drop policy if exists "Brands create own offers" on public.offers;
create policy "Brands create own offers"
  on public.offers for insert
  with check (
    (select auth.uid()) = brand_id
    and status in ('draft','sent')
  );

-- Brand: update own offers, but cannot set status='accepted'.
drop policy if exists "Brands update own offers" on public.offers;
create policy "Brands update own offers"
  on public.offers for update
  using ((select auth.uid()) = brand_id)
  with check (
    (select auth.uid()) = brand_id
    and status in ('draft','sent','declined','withdrawn')
  );

-- Athlete: read offers addressed to them, but never drafts.
drop policy if exists "Athletes read own offers" on public.offers;
create policy "Athletes read own offers"
  on public.offers for select
  using (
    (select auth.uid()) = athlete_id
    and status <> 'draft'
  );

-- Athlete: update own offers, restricted to accept/decline transitions.
drop policy if exists "Athletes respond to own offers" on public.offers;
create policy "Athletes respond to own offers"
  on public.offers for update
  using (
    (select auth.uid()) = athlete_id
    and status = 'sent'
  )
  with check (
    (select auth.uid()) = athlete_id
    and status in ('accepted','declined')
  );


-- ═══════════════════════════════════════════════════════════════════
-- DONE. Verify with:
--   select tablename from pg_tables where schemaname='public' and tablename='offers';
--   select policyname from pg_policies where tablename='offers';
-- ═══════════════════════════════════════════════════════════════════
