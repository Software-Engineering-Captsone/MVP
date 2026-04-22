-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Database Setup (Business Side)
-- Run this in Supabase Dashboard → SQL Editor → New Query.
-- Depends on supabase-setup.sql (profiles, handle_updated_at).
--
-- Built incrementally in the same order as the agreed plan:
--   1. brand_profiles        ← this block
--   2. campaigns             ← next
--   3. applications          ← next
--   4. deals + deal_deliverables
--   5. saved_athletes / saved_brands
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. BRAND_PROFILES (1:1 with profiles where role='brand')
-- ─────────────────────────────────────────────────────────────────
-- Brand-specific fields live here so athletes don't carry null columns
-- meant for companies. A brand's display/contact identity stays on
-- profiles (full_name = primary contact person, avatar_url = logo,
-- banner_url = hero image, bio = short tagline). Everything company-
-- specific — industry, size, HQ, budget posture — belongs here.
--
-- Decisions locked in:
--   • industry uses a check-constraint list (not a lookup table).
--     Cheaper until we exceed ~20 values; free-form extension via 'Other'.
--   • logo lives on profiles.avatar_url — one upload path, one column.
--   • primary contact name lives on profiles.full_name — no duplication.
--   • No money columns on this table; money lives on campaigns/deals.
--
-- Role enforcement: brand_id must reference a profile with role='brand'.
-- CHECK constraints can't subquery, so we enforce via a trigger.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.brand_profiles (
  brand_id              uuid references public.profiles(id) on delete cascade primary key,
  company_name          text not null default '',
  industry              text not null default 'Other' check (industry in (
    'Sports Nutrition', 'Apparel', 'Fitness Tech', 'Beverages',
    'Footwear', 'Fitness Equipment', 'Other'
  )),
  company_size          text check (company_size in ('1-10','11-50','51-200','201-1000','1000+','')) default '',
  website               text default '',
  tagline               text default '',
  about                 text default '',
  founded_year          integer check (
    founded_year is null
    or (founded_year >= 1800 and founded_year <= extract(year from now())::int)
  ),
  hq_country            text default 'United States',
  hq_state              text default '',
  hq_city               text default '',
  budget_tier           text check (budget_tier in ('micro','small','mid','large','enterprise','')) default '',
  typical_deal_range    text default '',
  primary_contact_role  text default '',
  onboarded_via         text check (onboarded_via in ('self_serve','sales_assisted','')) default 'self_serve',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Indexes sized to real filter patterns:
--   • industry  → athletes filter brand discovery by industry
--   • hq_state  → regional campaign match / local brands
create index if not exists idx_brand_profiles_industry on public.brand_profiles(industry);
create index if not exists idx_brand_profiles_hq_state on public.brand_profiles(hq_state)
  where hq_state <> '';


-- ─────────────────────────────────────────────────────────────────
-- Role enforcement trigger.
-- brand_id must point to a profile whose role = 'brand'. We can't put
-- this in a CHECK (no subqueries allowed), so it runs as a BEFORE
-- INSERT/UPDATE trigger.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.verify_brand_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.brand_id
      and role = 'brand'
  ) then
    raise exception 'brand_profiles.brand_id must reference a profile with role=''brand''';
  end if;
  return new;
end;
$$;

drop trigger if exists brand_profiles_verify_role on public.brand_profiles;
create trigger brand_profiles_verify_role
  before insert or update of brand_id on public.brand_profiles
  for each row execute function public.verify_brand_profile_role();


-- Reuse the shared updated_at trigger defined in supabase-setup.sql.
drop trigger if exists on_brand_profile_updated on public.brand_profiles;
create trigger on_brand_profile_updated
  before update on public.brand_profiles
  for each row execute procedure public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- RLS
-- auth.uid() is wrapped in (select …) so Postgres evaluates it once
-- per query (initPlan), not once per row — standard Supabase perf note.
-- ─────────────────────────────────────────────────────────────────
alter table public.brand_profiles enable row level security;

-- Owner: full CRUD on own row
drop policy if exists "Brands manage own profile" on public.brand_profiles;
create policy "Brands manage own profile"
  on public.brand_profiles for all
  using ((select auth.uid()) = brand_id)
  with check ((select auth.uid()) = brand_id);

-- Public read: any authenticated user (athletes browsing brands) can see
-- brand profiles. Row existence = visible — a brand_profiles row is only
-- created once a brand begins onboarding, so no incomplete junk leaks.
drop policy if exists "Anyone can view brand profiles" on public.brand_profiles;
create policy "Anyone can view brand profiles"
  on public.brand_profiles for select
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- 2. CAMPAIGNS
-- ─────────────────────────────────────────────────────────────────
-- A campaign is a brand's open call for athlete partnerships. Replaces
-- the prototype-era Mongoose `Campaign` model + data/local-campaign-store.json.
--
-- Design decisions locked in from the plan:
--   • FK brand_id → brand_profiles.brand_id (not profiles.id). This is
--     how we transitively guarantee role='brand' without a separate
--     trigger — if a brand_profiles row exists, role is enforced.
--   • Money as bigint cents + currency. integer maxes at ~$21M which is
--     a realistic ceiling; bigint costs nothing and is safe forever.
--   • Packages are snapshotted as text columns + arrays on the campaign
--     row itself (package_id, package_details, platforms). Package
--     templates can evolve server-side without mutating live campaigns.
--   • Targeting filters are typed columns (target_sport, target_gender,
--     target_follower_min, target_location) + text arrays for schools.
--     No JSONB — these are filtered on, so the planner needs typed cols.
--   • State machine is enforced by trigger. Terminal states (Completed,
--     Cancelled) are locked. Cannot revert to pre-application states
--     once applications have started.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.campaigns (
  id                    uuid default gen_random_uuid() primary key,
  brand_id              uuid not null references public.brand_profiles(brand_id) on delete cascade,

  -- Identity
  name                  text not null,
  subtitle              text default '',
  goal                  text check (goal in (
                          'Brand Awareness','Lead Gen','Sales',
                          'Engagement','Foot Traffic','UGC Focus',''
                        )) default '',
  brief                 text default '',
  image_url             text default '',

  -- Lifecycle
  status                text not null check (status in (
                          'Draft','Ready to Launch','Open for Applications',
                          'Reviewing Candidates','Deal Creation in Progress',
                          'Active','Completed','Cancelled'
                        )) default 'Draft',
  visibility            text not null check (visibility in ('Public','Private')) default 'Public',
  accept_applications   boolean not null default true,

  -- Package snapshot (denormalized so template changes don't mutate campaigns)
  package_id            text default '',
  package_name          text default '',
  package_details       text[] not null default '{}',
  platforms             text[] not null default '{}',

  -- Budget + schedule. Store money as integer cents, never as a string.
  budget_cents          bigint,
  budget_currency       text not null default 'USD',
  start_date            date,
  end_date              date,
  duration_label        text default '',

  -- Targeting (what the brand wants in athletes)
  target_sport          text default 'All Sports',
  target_gender         text check (target_gender in ('male','female','nonbinary','any')) default 'any',
  target_follower_min   integer not null default 0 check (target_follower_min >= 0),
  target_location       text default '',
  target_schools        text[] not null default '{}',

  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),

  check (end_date is null or start_date is null or end_date >= start_date),
  check (budget_cents is null or budget_cents >= 0)
);

-- Indexes sized to real query patterns:
--   • Brand dashboard:  WHERE brand_id = ? ORDER BY created_at desc
create index if not exists idx_campaigns_brand
  on public.campaigns(brand_id, created_at desc);

--   • Athlete discovery feed: open & public campaigns, newest first.
--     Partial index keeps it tiny — only a fraction of campaigns are open.
create index if not exists idx_campaigns_open_public
  on public.campaigns(created_at desc)
  where visibility = 'Public'
    and accept_applications = true
    and status in ('Open for Applications','Reviewing Candidates');

--   • Sport filter on discovery feed
create index if not exists idx_campaigns_target_sport
  on public.campaigns(target_sport)
  where visibility = 'Public'
    and status in ('Open for Applications','Reviewing Candidates');

--   • GIN arrays for platform/school containment queries
create index if not exists idx_campaigns_platforms
  on public.campaigns using gin(platforms);
create index if not exists idx_campaigns_target_schools
  on public.campaigns using gin(target_schools);


-- ─────────────────────────────────────────────────────────────────
-- State-machine trigger
-- ─────────────────────────────────────────────────────────────────
create or replace function public.enforce_campaign_status_transitions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  terminal constant text[]           := array['Completed','Cancelled'];
  pre_application constant text[]    := array['Draft','Ready to Launch'];
begin
  if old.status is distinct from new.status then
    -- Completed and Cancelled are terminal
    if old.status = any(terminal) then
      raise exception 'Cannot change status of a % campaign', old.status;
    end if;
    -- Cannot revert to Draft/Ready to Launch once past that phase
    if new.status = any(pre_application)
       and old.status <> all(pre_application) then
      raise exception 'Cannot revert campaign from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_enforce_transitions on public.campaigns;
create trigger campaigns_enforce_transitions
  before update of status on public.campaigns
  for each row execute function public.enforce_campaign_status_transitions();


-- updated_at maintained by the shared trigger function
drop trigger if exists on_campaign_updated on public.campaigns;
create trigger on_campaign_updated
  before update on public.campaigns
  for each row execute procedure public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────
alter table public.campaigns enable row level security;

-- Owner: brand has full CRUD on their own campaigns
drop policy if exists "Brands manage own campaigns" on public.campaigns;
create policy "Brands manage own campaigns"
  on public.campaigns for all
  using ((select auth.uid()) = brand_id)
  with check ((select auth.uid()) = brand_id);

-- Discovery: athletes (and any signed-in user) can read only campaigns
-- that are public AND in an application-open status. Private and
-- draft campaigns stay hidden. A second policy in the applications
-- step will extend this so applicants can also see the campaign they
-- applied to even if it moves out of the open phase.
drop policy if exists "Anyone can view open public campaigns" on public.campaigns;
create policy "Anyone can view open public campaigns"
  on public.campaigns for select
  using (
    visibility = 'Public'
    and status in ('Open for Applications','Reviewing Candidates')
  );


-- ─────────────────────────────────────────────────────────────────
-- 3. APPLICATIONS
-- ─────────────────────────────────────────────────────────────────
-- An athlete's formal bid to join a campaign. Brand reviews pending
-- applications and moves them to shortlisted/approved/declined.
-- Athlete can withdraw before a decision is made.
--
-- Design decisions:
--   • athlete_snapshot is JSONB on purpose — it's a point-in-time
--     capture of the athlete's stats at application time, never
--     filtered on. The brand should see "what was pitched" even if
--     the athlete later updates their profile.
--   • One row per (campaign, athlete) pair — uniqueness enforced.
--   • State machine is enforced by trigger + RLS WITH CHECK:
--       - Athlete can set status = 'pending' (insert) or 'withdrawn' only.
--       - Brand can set status = 'shortlisted'/'approved'/'declined' only.
--       - Neither side can revert an 'approved'/'declined'/'withdrawn' row.
--   • decided_at is auto-set by the trigger when status leaves 'pending'.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.applications (
  id                    uuid default gen_random_uuid() primary key,
  campaign_id           uuid not null references public.campaigns(id) on delete cascade,
  athlete_id            uuid not null references public.profiles(id)  on delete cascade,
  status                text not null check (status in (
                          'pending','shortlisted','approved','declined','withdrawn'
                        )) default 'pending',
  pitch                 text default '',
  athlete_snapshot      jsonb not null default '{}'::jsonb,
  decided_at            timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  unique (campaign_id, athlete_id)
);

-- Indexes sized to real query patterns:
--   • Brand review dashboard: WHERE campaign_id = ? AND status = ?
create index if not exists idx_applications_campaign_status
  on public.applications(campaign_id, status);

--   • Athlete "My Applications" list
create index if not exists idx_applications_athlete
  on public.applications(athlete_id, created_at desc);

--   • Pending-count badge on the brand's campaigns list
create index if not exists idx_applications_pending_by_campaign
  on public.applications(campaign_id)
  where status = 'pending';


-- ─────────────────────────────────────────────────────────────────
-- Trigger 1: refuse inserts on campaigns that are not accepting apps
-- RLS gates row access; this trigger enforces business logic that
-- can't be expressed cleanly in a CHECK.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.validate_application_campaign_open()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaigns c
    where c.id = new.campaign_id
      and c.visibility = 'Public'
      and c.accept_applications = true
      and c.status in ('Open for Applications','Reviewing Candidates')
  ) then
    raise exception 'Campaign is not accepting applications';
  end if;
  return new;
end;
$$;

drop trigger if exists applications_validate_open on public.applications;
create trigger applications_validate_open
  before insert on public.applications
  for each row execute function public.validate_application_campaign_open();


-- ─────────────────────────────────────────────────────────────────
-- Trigger 2: state machine + immutables + decided_at auto-stamp
-- ─────────────────────────────────────────────────────────────────
create or replace function public.enforce_application_transitions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  terminal constant text[] := array['approved','declined','withdrawn'];
begin
  -- Immutable fields
  if old.campaign_id is distinct from new.campaign_id then
    raise exception 'applications.campaign_id is immutable';
  end if;
  if old.athlete_id is distinct from new.athlete_id then
    raise exception 'applications.athlete_id is immutable';
  end if;

  -- Status transitions
  if old.status is distinct from new.status then
    if old.status = any(terminal) then
      raise exception 'Cannot change status of a % application', old.status;
    end if;
    -- Auto-stamp the moment status leaves 'pending'
    if old.status = 'pending' and new.status <> 'pending' then
      new.decided_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists applications_enforce_transitions on public.applications;
create trigger applications_enforce_transitions
  before update on public.applications
  for each row execute function public.enforce_application_transitions();


-- updated_at maintained by the shared trigger function
drop trigger if exists on_application_updated on public.applications;
create trigger on_application_updated
  before update on public.applications
  for each row execute procedure public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- RLS
-- Two separate policies per command because athlete and brand have
-- different column-level write rights. WITH CHECK enforces that each
-- side can only set the statuses they're allowed to.
-- ─────────────────────────────────────────────────────────────────
alter table public.applications enable row level security;

-- Athlete: insert, read, update their own application rows.
-- Athlete may only write status in {'pending','withdrawn'}.
drop policy if exists "Athletes manage own applications" on public.applications;
create policy "Athletes manage own applications"
  on public.applications for all
  using ((select auth.uid()) = athlete_id)
  with check (
    (select auth.uid()) = athlete_id
    and status in ('pending','withdrawn')
  );

-- Brand: read + update applications to their own campaigns.
-- Brand may only write status in {'shortlisted','approved','declined'}
-- (and may keep it at 'pending', e.g., a no-op update).
drop policy if exists "Brands review applications on own campaigns" on public.applications;
create policy "Brands review applications on own campaigns"
  on public.applications for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.brand_id = (select auth.uid())
    )
  );
drop policy if exists "Brands update applications on own campaigns" on public.applications;
create policy "Brands update applications on own campaigns"
  on public.applications for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.brand_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.brand_id = (select auth.uid())
    )
    and status in ('pending','shortlisted','approved','declined')
  );


-- ─────────────────────────────────────────────────────────────────
-- Cross-policy: let applicants read the campaign they applied to
-- even after it leaves 'Open for Applications'. Without this, an
-- athlete's "My Applications" page would break for mature campaigns.
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Applicants can view their campaigns" on public.campaigns;
create policy "Applicants can view their campaigns"
  on public.campaigns for select
  using (
    exists (
      select 1 from public.applications a
      where a.campaign_id = campaigns.id
        and a.athlete_id = (select auth.uid())
    )
  );


-- ─────────────────────────────────────────────────────────────────
-- 4. DEALS
-- ─────────────────────────────────────────────────────────────────
-- A deal is the formal agreement between a brand and an athlete.
-- Deals are created after an application is approved, OR directly
-- (off-campaign direct outreach). Once accepted, the terms become
-- immutable — edits happen via new deal rows, not mutation.
--
-- Design decisions:
--   • campaign_id is nullable: direct brand→athlete deals exist too.
--   • Money in bigint cents + currency, same as campaigns.
--   • `deliverables` lives in its own table (deal_deliverables) —
--     brands run "show me overdue deliverables" queries across many
--     deals, and that's a rows query, not a JSON query.
--   • contract_url lives in Supabase Storage; this column just holds
--     the URL. Signature flags are tracked as booleans + timestamps.
--   • State machine trigger locks the deal against terms changes
--     once status = 'accepted' and later, and locks entirely once
--     status = 'completed' or 'cancelled'.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.deals (
  id                          uuid default gen_random_uuid() primary key,
  campaign_id                 uuid references public.campaigns(id) on delete set null,
  brand_id                    uuid not null references public.brand_profiles(brand_id) on delete cascade,
  athlete_id                  uuid not null references public.profiles(id) on delete cascade,

  -- Lifecycle
  status                      text not null check (status in (
                                'proposed','negotiating','accepted','in_progress',
                                'awaiting_review','completed','disputed','cancelled'
                              )) default 'proposed',

  -- Terms snapshot (frozen once status = 'accepted')
  title                       text not null default '',
  duration                    text default '',
  start_date                  date,
  end_date                    date,
  compensation_cents          bigint not null default 0 check (compensation_cents >= 0),
  compensation_currency       text not null default 'USD',
  compensation_note           text default '',

  -- Contract
  contract_url                text default '',
  contract_signed_at          timestamptz,
  contract_signed_by_athlete  boolean not null default false,
  contract_signed_by_brand    boolean not null default false,

  -- Audit
  accepted_at                 timestamptz,
  completed_at                timestamptz,
  cancelled_at                timestamptz,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now(),

  check (end_date is null or start_date is null or end_date >= start_date)
);

-- Indexes:
--   • Brand deals list WHERE brand_id = ? ORDER BY created_at desc
create index if not exists idx_deals_brand
  on public.deals(brand_id, created_at desc);
--   • Athlete deals list
create index if not exists idx_deals_athlete
  on public.deals(athlete_id, created_at desc);
--   • Lookup by campaign when present
create index if not exists idx_deals_campaign
  on public.deals(campaign_id)
  where campaign_id is not null;
--   • Status filter (active deals dashboard, overdue reports)
create index if not exists idx_deals_status
  on public.deals(status);


-- ─────────────────────────────────────────────────────────────────
-- Trigger: state machine + immutable-terms guard + audit stamps
-- ─────────────────────────────────────────────────────────────────
create or replace function public.enforce_deal_transitions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  terminal constant text[] := array['completed','cancelled'];
  frozen_after constant text[] := array['accepted','in_progress','awaiting_review','completed','disputed','cancelled'];
begin
  -- Immutable parties
  if old.brand_id   is distinct from new.brand_id   then raise exception 'deals.brand_id is immutable';   end if;
  if old.athlete_id is distinct from new.athlete_id then raise exception 'deals.athlete_id is immutable'; end if;

  -- Status transitions
  if old.status is distinct from new.status then
    if old.status = any(terminal) then
      raise exception 'Cannot change status of a % deal', old.status;
    end if;
    if old.status = 'proposed' and new.status = 'accepted' then
      new.accepted_at := now();
    end if;
    if new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
    if new.status = 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
    end if;
  end if;

  -- Terms freeze once status reaches 'accepted' or beyond
  if old.status = any(frozen_after) then
    if old.title                 is distinct from new.title                 then raise exception 'Deal terms are frozen (title)';                 end if;
    if old.duration              is distinct from new.duration              then raise exception 'Deal terms are frozen (duration)';              end if;
    if old.start_date            is distinct from new.start_date            then raise exception 'Deal terms are frozen (start_date)';            end if;
    if old.end_date              is distinct from new.end_date              then raise exception 'Deal terms are frozen (end_date)';              end if;
    if old.compensation_cents    is distinct from new.compensation_cents    then raise exception 'Deal terms are frozen (compensation_cents)';    end if;
    if old.compensation_currency is distinct from new.compensation_currency then raise exception 'Deal terms are frozen (compensation_currency)'; end if;
    if old.compensation_note     is distinct from new.compensation_note     then raise exception 'Deal terms are frozen (compensation_note)';     end if;
  end if;

  return new;
end;
$$;

drop trigger if exists deals_enforce_transitions on public.deals;
create trigger deals_enforce_transitions
  before update on public.deals
  for each row execute function public.enforce_deal_transitions();

drop trigger if exists on_deal_updated on public.deals;
create trigger on_deal_updated
  before update on public.deals
  for each row execute procedure public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- RLS — both parties can see and (within state rules) update the deal.
-- Terms-freeze is enforced by the trigger, not by RLS, so both sides
-- share the same policy expressions.
-- ─────────────────────────────────────────────────────────────────
alter table public.deals enable row level security;

drop policy if exists "Parties can view deals" on public.deals;
create policy "Parties can view deals"
  on public.deals for select
  using (
    (select auth.uid()) in (brand_id, athlete_id)
  );

drop policy if exists "Brand can create deals" on public.deals;
create policy "Brand can create deals"
  on public.deals for insert
  with check ((select auth.uid()) = brand_id);

drop policy if exists "Parties can update deals" on public.deals;
create policy "Parties can update deals"
  on public.deals for update
  using ((select auth.uid()) in (brand_id, athlete_id))
  with check ((select auth.uid()) in (brand_id, athlete_id));


-- ─────────────────────────────────────────────────────────────────
-- 4b. DEAL_DELIVERABLES
-- ─────────────────────────────────────────────────────────────────
-- Individual content promises inside a deal. Split from deals.jsonb
-- because brands query across deliverables ("show me all overdue
-- deliverables for my campaigns"), which is a typed-row query.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.deal_deliverables (
  id                    uuid default gen_random_uuid() primary key,
  deal_id               uuid not null references public.deals(id) on delete cascade,
  content_type          text not null check (content_type in (
                          'instagram_post','instagram_reel','instagram_story',
                          'tiktok','youtube','ugc_photo','ugc_video','other'
                        )),
  description           text default '',
  due_date              date,
  assigned_athlete_id   uuid references public.profiles(id) on delete set null,
  submitted_url         text default '',
  status                text not null check (status in (
                          'pending','in_progress','submitted','approved','rejected','overdue'
                        )) default 'pending',
  submitted_at          timestamptz,
  approved_at           timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_deliverables_deal_status
  on public.deal_deliverables(deal_id, status);
create index if not exists idx_deliverables_assigned_athlete
  on public.deal_deliverables(assigned_athlete_id, status)
  where assigned_athlete_id is not null;
create index if not exists idx_deliverables_overdue
  on public.deal_deliverables(due_date)
  where status in ('pending','in_progress');


drop trigger if exists on_deliverable_updated on public.deal_deliverables;
create trigger on_deliverable_updated
  before update on public.deal_deliverables
  for each row execute procedure public.handle_updated_at();


alter table public.deal_deliverables enable row level security;

drop policy if exists "Parties can view deliverables" on public.deal_deliverables;
create policy "Parties can view deliverables"
  on public.deal_deliverables for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and (select auth.uid()) in (d.brand_id, d.athlete_id)
    )
  );

drop policy if exists "Parties can manage deliverables" on public.deal_deliverables;
create policy "Parties can manage deliverables"
  on public.deal_deliverables for all
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and (select auth.uid()) in (d.brand_id, d.athlete_id)
    )
  )
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and (select auth.uid()) in (d.brand_id, d.athlete_id)
    )
  );


-- ─────────────────────────────────────────────────────────────────
-- 5a. SAVED_ATHLETES — brand bookmarks
-- ─────────────────────────────────────────────────────────────────
-- Composite PK (brand_id, athlete_id) serves as the dedup key and
-- the primary lookup index. No secondary indexes needed until we
-- outgrow "brand's saved list" sizes.
--
-- Privacy: a brand's saved list is private. Athletes cannot see
-- which brands have bookmarked them — keeps sales interest
-- asymmetric and avoids social-pressure UX.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.saved_athletes (
  brand_id    uuid not null references public.brand_profiles(brand_id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id)             on delete cascade,
  note        text default '',
  saved_at    timestamptz not null default now(),
  primary key (brand_id, athlete_id)
);

alter table public.saved_athletes enable row level security;

drop policy if exists "Brands manage own saved athletes" on public.saved_athletes;
create policy "Brands manage own saved athletes"
  on public.saved_athletes for all
  using ((select auth.uid()) = brand_id)
  with check ((select auth.uid()) = brand_id);


-- ─────────────────────────────────────────────────────────────────
-- 5b. SAVED_BRANDS — athlete bookmarks
-- ─────────────────────────────────────────────────────────────────
-- Mirror of saved_athletes. athlete_id → profiles.id (no role check
-- necessary; brand_id FK to brand_profiles.brand_id transitively
-- guarantees the saved entity is a real brand).
--
-- Privacy: athlete's saved list is private to them. Brands cannot
-- see which athletes bookmarked them.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.saved_brands (
  athlete_id  uuid not null references public.profiles(id)             on delete cascade,
  brand_id    uuid not null references public.brand_profiles(brand_id) on delete cascade,
  note        text default '',
  saved_at    timestamptz not null default now(),
  primary key (athlete_id, brand_id)
);

alter table public.saved_brands enable row level security;

drop policy if exists "Athletes manage own saved brands" on public.saved_brands;
create policy "Athletes manage own saved brands"
  on public.saved_brands for all
  using ((select auth.uid()) = athlete_id)
  with check ((select auth.uid()) = athlete_id);


-- ─────────────────────────────────────────────────────────────────
-- 6. COMPAT COLUMNS FOR D-LITE API SHIM
-- ─────────────────────────────────────────────────────────────────
-- The legacy /api/campaigns and /api/applications routes were designed
-- around a Mongoose + local-JSON store. Those shapes leak two fields
-- that don't map cleanly to the normalized Supabase schema:
--
--   • budget was a free-form text like "$15,000" or "Negotiable".
--     budget_cents is the normalized, analyzable form — we keep that —
--     but we also preserve the original text verbatim so brand UX is
--     unchanged. budget_cents stays null until a later migration.
--
--   • applications.messages was an embedded array of chat sub-documents.
--     The principled home is the top-level messages table (via a
--     context_type FK), but that's a later refactor. For now we keep
--     the array colocated with the application row.
--
-- Both ALTERs are idempotent so re-running the whole file is safe.
-- ─────────────────────────────────────────────────────────────────
alter table public.campaigns     add column if not exists budget_label text default '';
alter table public.applications  add column if not exists messages     jsonb not null default '[]'::jsonb;
