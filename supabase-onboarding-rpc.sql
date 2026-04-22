-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Onboarding RPC Functions
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Depends on supabase-setup.sql (profiles + athlete_* tables).
--
-- All functions are SECURITY INVOKER, so the existing per-table RLS
-- policies enforce that a caller can only read/write their own rows.
-- Nothing here grants extra privileges.
--
-- One RPC per onboarding step (clean 1:1 mapping with the wizard UI),
-- plus one completion marker and one hydration query.
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. upsert_athlete_basics
--    Step 1 of the wizard. Writes name + contact fields onto the
--    profiles row that the signup trigger already created.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.upsert_athlete_basics(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles set
    full_name          = coalesce(payload ->> 'full_name', full_name),
    alternate_email    = coalesce(payload ->> 'alternate_email', alternate_email),
    phone              = coalesce(payload ->> 'phone', phone),
    contact_preference = coalesce(payload ->> 'contact_preference', contact_preference),
    country            = coalesce(payload ->> 'country', country)
  where id = uid;
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 2. upsert_athlete_sports
--    Step 2. Replaces the athlete's sports list with the provided
--    array. DELETE-then-INSERT inside one transaction so a half-
--    failed rewrite cannot leave stale rows behind.
--
--    Payload shape:
--      [ { "sport": "Basketball", "position": "PG", "is_primary": true }, ... ]
-- ─────────────────────────────────────────────────────────────────
create or replace function public.upsert_athlete_sports(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_typeof(payload) <> 'array' then
    raise exception 'sports payload must be a JSON array';
  end if;

  delete from public.athlete_sports where athlete_id = uid;

  for row in select * from jsonb_array_elements(payload) loop
    if coalesce(row ->> 'sport', '') = '' then
      continue;
    end if;
    insert into public.athlete_sports (athlete_id, sport, position, jersey_number, is_primary)
    values (
      uid,
      row ->> 'sport',
      coalesce(row ->> 'position', ''),
      coalesce(row ->> 'jersey_number', ''),
      coalesce((row ->> 'is_primary')::boolean, false)
    );
  end loop;
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 3. upsert_athlete_academic
--    Step 3. School + academic fields. UPSERT pattern so calling it
--    twice is safe (second call updates instead of duplicating).
-- ─────────────────────────────────────────────────────────────────
create or replace function public.upsert_athlete_academic(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.athlete_academics (
    athlete_id, school, school_domain, school_email,
    current_year, eligibility_status, eligibility_years
  ) values (
    uid,
    coalesce(payload ->> 'school', ''),
    coalesce(payload ->> 'school_domain', ''),
    coalesce(payload ->> 'school_email', ''),
    coalesce(payload ->> 'current_year', ''),
    coalesce(payload ->> 'eligibility_status', ''),
    nullif(payload ->> 'eligibility_years', '')::integer
  )
  on conflict (athlete_id) do update set
    school             = excluded.school,
    school_domain      = excluded.school_domain,
    school_email       = excluded.school_email,
    current_year       = excluded.current_year,
    eligibility_status = excluded.eligibility_status,
    eligibility_years  = excluded.eligibility_years;
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 4. upsert_athlete_compliance
--    Step 4. Verification + NIL disclosure flags. Lives on
--    athlete_academics since compliance is school-tied.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.upsert_athlete_compliance(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.athlete_academics (
    athlete_id, school_email_verified, school_email_verified_at,
    id_verified, aco_email, nil_disclosure_required
  ) values (
    uid,
    coalesce((payload ->> 'school_email_verified')::boolean, false),
    case when coalesce((payload ->> 'school_email_verified')::boolean, false)
         then now() else null end,
    coalesce((payload ->> 'id_verified')::boolean, false),
    coalesce(payload ->> 'aco_email', ''),
    coalesce((payload ->> 'nil_disclosure_required')::boolean, false)
  )
  on conflict (athlete_id) do update set
    school_email_verified    = excluded.school_email_verified,
    school_email_verified_at = case
      when excluded.school_email_verified
       and not public.athlete_academics.school_email_verified
      then now()
      else public.athlete_academics.school_email_verified_at
    end,
    id_verified              = excluded.id_verified,
    aco_email                = excluded.aco_email,
    nil_disclosure_required  = excluded.nil_disclosure_required;
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 5. upsert_athlete_profile_section
--    Step 5. Bio + banner + availability live on profiles; socials
--    on athlete_socials. Two writes inside one function = atomic.
--    Note: avatar_url is intentionally NOT touched here — uploadAvatar
--    owns that column and writes it the moment a photo is uploaded.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.upsert_athlete_profile_section(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof   jsonb := coalesce(payload -> 'profile', '{}'::jsonb);
  socs   jsonb := coalesce(payload -> 'socials', '{}'::jsonb);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles set
    bio                 = coalesce(prof ->> 'bio', bio),
    banner_url          = coalesce(prof ->> 'banner_url', banner_url),
    availability_status = coalesce(prof ->> 'availability_status', availability_status)
  where id = uid;

  insert into public.athlete_socials (
    athlete_id, instagram, tiktok, twitter, other_platform
  ) values (
    uid,
    coalesce(socs ->> 'instagram', ''),
    coalesce(socs ->> 'tiktok', ''),
    coalesce(socs ->> 'twitter', ''),
    coalesce(socs ->> 'other_platform', '')
  )
  on conflict (athlete_id) do update set
    instagram      = excluded.instagram,
    tiktok         = excluded.tiktok,
    twitter        = excluded.twitter,
    other_platform = excluded.other_platform;
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 6. mark_athlete_onboarding_complete
--    Final click. Sets the timestamp the gate reads.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.mark_athlete_onboarding_complete()
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
-- 7. get_athlete_onboarding_state
--    Hydration query. Returns a single JSON object the client can
--    map directly into the OnboardingDraft shape. One round-trip,
--    no client-side joins.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.get_athlete_onboarding_state()
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
    'basics', (
      select jsonb_build_object(
        'full_name', p.full_name,
        'email', p.email,
        'alternate_email', p.alternate_email,
        'phone', p.phone,
        'contact_preference', p.contact_preference,
        'country', p.country
      )
      from public.profiles p where p.id = uid
    ),
    'athletic', jsonb_build_object(
      'sports', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id,
          'sport', s.sport,
          'position', s.position,
          'jersey_number', s.jersey_number,
          'is_primary', s.is_primary
        ))
        from public.athlete_sports s
        where s.athlete_id = uid
      ), '[]'::jsonb)
    ),
    'academic', (
      select jsonb_build_object(
        'school', a.school,
        'school_domain', a.school_domain,
        'school_email', a.school_email,
        'current_year', a.current_year,
        'eligibility_status', a.eligibility_status,
        'eligibility_years', a.eligibility_years
      )
      from public.athlete_academics a where a.athlete_id = uid
    ),
    'compliance', (
      select jsonb_build_object(
        'school_email_verified', a.school_email_verified,
        'id_verified', a.id_verified,
        'aco_email', a.aco_email,
        'nil_disclosure_required', a.nil_disclosure_required
      )
      from public.athlete_academics a where a.athlete_id = uid
    ),
    'profile', (
      select jsonb_build_object(
        'bio', p.bio,
        'avatar_url', p.avatar_url,
        'banner_url', p.banner_url,
        'availability_status', p.availability_status,
        'onboarding_completed_at', p.onboarding_completed_at
      )
      from public.profiles p where p.id = uid
    ),
    'socials', (
      select jsonb_build_object(
        'instagram', s.instagram,
        'tiktok', s.tiktok,
        'twitter', s.twitter,
        'other_platform', s.other_platform
      )
      from public.athlete_socials s where s.athlete_id = uid
    )
  )
  into result;

  return result;
end;
$$;
