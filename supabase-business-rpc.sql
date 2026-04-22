-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Brand-side Onboarding RPC Functions
-- Run this in Supabase Dashboard → SQL Editor → New Query.
-- Depends on supabase-setup.sql (profiles) and supabase-business-setup.sql
-- (brand_profiles).
--
-- All functions are SECURITY INVOKER, so existing per-table RLS policies
-- enforce that a caller can only read/write their own rows.
--
-- Why RPCs for brand onboarding but not for campaigns/applications/deals?
-- Onboarding writes span two tables (profiles + brand_profiles), and we
-- want that atomic. Campaign/application/deal writes are single-row
-- operations that RLS + CHECKs already handle cleanly from client code.
-- Don't add a wrapper layer until a real requirement demands it.
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. upsert_brand_company_info
--    Writes the shared profile fields (phone, location, contact) AND
--    the brand_profiles row in one transaction. Called once per
--    onboarding submission and again from the brand's profile editor.
--
--    The brand_profiles INSERT conflicts on brand_id (the 1:1 key),
--    so first call inserts, every subsequent call updates.
--
--    Payload shape:
--      {
--        "profile": { full_name, phone, contact_preference,
--                     country, state, city },
--        "company": { company_name, industry, company_size, website,
--                     tagline, about, founded_year, hq_country,
--                     hq_state, hq_city, budget_tier,
--                     typical_deal_range, primary_contact_role }
--      }
-- ─────────────────────────────────────────────────────────────────
create or replace function public.upsert_brand_company_info(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid  uuid  := auth.uid();
  prof jsonb := coalesce(payload -> 'profile', '{}'::jsonb);
  co   jsonb := coalesce(payload -> 'company', '{}'::jsonb);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Shared profile fields (primary contact, preferred location)
  update public.profiles set
    full_name          = coalesce(prof ->> 'full_name',          full_name),
    phone              = coalesce(prof ->> 'phone',              phone),
    contact_preference = coalesce(prof ->> 'contact_preference', contact_preference),
    country            = coalesce(prof ->> 'country',            country),
    state              = coalesce(prof ->> 'state',              state),
    city               = coalesce(prof ->> 'city',               city)
  where id = uid;

  -- Brand-specific fields. The role-enforcement trigger on
  -- brand_profiles rejects this insert if profiles.role <> 'brand',
  -- giving a clean error for misuse.
  insert into public.brand_profiles (
    brand_id, company_name, industry, company_size, website,
    tagline, about, founded_year, hq_country, hq_state, hq_city,
    budget_tier, typical_deal_range, primary_contact_role
  ) values (
    uid,
    coalesce(co ->> 'company_name',   ''),
    coalesce(co ->> 'industry',       'Other'),
    coalesce(co ->> 'company_size',   ''),
    coalesce(co ->> 'website',        ''),
    coalesce(co ->> 'tagline',        ''),
    coalesce(co ->> 'about',          ''),
    nullif(co ->> 'founded_year', '')::integer,
    coalesce(co ->> 'hq_country',     'United States'),
    coalesce(co ->> 'hq_state',       ''),
    coalesce(co ->> 'hq_city',        ''),
    coalesce(co ->> 'budget_tier',    ''),
    coalesce(co ->> 'typical_deal_range',   ''),
    coalesce(co ->> 'primary_contact_role', '')
  )
  on conflict (brand_id) do update set
    company_name         = excluded.company_name,
    industry             = excluded.industry,
    company_size         = excluded.company_size,
    website              = excluded.website,
    tagline              = excluded.tagline,
    about                = excluded.about,
    founded_year         = excluded.founded_year,
    hq_country           = excluded.hq_country,
    hq_state             = excluded.hq_state,
    hq_city              = excluded.hq_city,
    budget_tier          = excluded.budget_tier,
    typical_deal_range   = excluded.typical_deal_range,
    primary_contact_role = excluded.primary_contact_role;
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 2. mark_brand_onboarding_complete
--    Stamps profiles.onboarding_completed_at if not already set.
--    Idempotent — a second call preserves the original timestamp.
--    Reuses the SAME column as athletes (profiles.onboarding_completed_at)
--    so the dashboard gate doesn't need a role-specific query.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.mark_brand_onboarding_complete()
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ts  timestamptz := now();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
    set onboarding_completed_at = coalesce(onboarding_completed_at, ts)
    where id = uid;

  return ts;
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 3. get_brand_onboarding_state
--    Hydration query — returns everything the brand's onboarding
--    wizard or profile editor needs, in one JSON blob.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.get_brand_onboarding_state()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'full_name',          p.full_name,
        'email',              p.email,
        'phone',              p.phone,
        'contact_preference', p.contact_preference,
        'country',            p.country,
        'state',              p.state,
        'city',               p.city,
        'avatar_url',         p.avatar_url,
        'banner_url',         p.banner_url,
        'bio',                p.bio,
        'onboarding_completed_at', p.onboarding_completed_at
      )
      from public.profiles p where p.id = uid
    ),
    'company', (
      select jsonb_build_object(
        'company_name',         b.company_name,
        'industry',             b.industry,
        'company_size',         b.company_size,
        'website',              b.website,
        'tagline',              b.tagline,
        'about',                b.about,
        'founded_year',         b.founded_year,
        'hq_country',           b.hq_country,
        'hq_state',             b.hq_state,
        'hq_city',              b.hq_city,
        'budget_tier',          b.budget_tier,
        'typical_deal_range',   b.typical_deal_range,
        'primary_contact_role', b.primary_contact_role
      )
      from public.brand_profiles b where b.brand_id = uid
    )
  )
  into result;

  return result;
end;
$$;
