-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Social OAuth + Email Verification Migration
-- Run in Supabase Dashboard → SQL Editor → New Query
-- Depends on: supabase-setup.sql, supabase-onboarding-rpc.sql
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. athlete_socials: add YouTube, drop other_platform/other_followers,
--    recreate total_followers generated column to include YouTube.
--
--    GENERATED ALWAYS columns cannot be altered — must drop and re-add.
-- ─────────────────────────────────────────────────────────────────

alter table public.athlete_socials
  add column if not exists youtube          text    default '',
  add column if not exists youtube_subscribers integer default 0,
  add column if not exists youtube_avg_views  bigint  default 0;

-- Drop the generated column before removing its source columns
alter table public.athlete_socials drop column if exists total_followers;

alter table public.athlete_socials
  drop column if exists other_platform,
  drop column if exists other_followers;

-- Recreate with YouTube included
alter table public.athlete_socials
  add column total_followers integer generated always as (
    coalesce(instagram_followers, 0) +
    coalesce(tiktok_followers,   0) +
    coalesce(twitter_followers,  0) +
    coalesce(facebook_followers, 0) +
    coalesce(youtube_subscribers, 0)
  ) stored;


-- ─────────────────────────────────────────────────────────────────
-- 2. athlete_social_tokens — stores OAuth access tokens for each
--    connected social platform. Service role only for writes; athletes
--    can SELECT their own rows to display connection status.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.athlete_social_tokens (
  id               uuid        default gen_random_uuid() primary key,
  athlete_id       uuid        references public.profiles(id) on delete cascade not null,
  platform         text        not null check (platform in ('instagram','tiktok','youtube')),
  platform_user_id text        not null default '',
  handle           text        not null default '',
  access_token     text        not null,
  refresh_token    text                 default '',
  token_expires_at timestamptz,
  follower_count   integer              default 0,
  following_count  integer              default 0,
  extra_stats      jsonb                default '{}'::jsonb,
  connected_at     timestamptz          default now(),
  last_synced_at   timestamptz,
  unique (athlete_id, platform)
);

alter table public.athlete_social_tokens enable row level security;

drop policy if exists "Athletes can view own social tokens" on public.athlete_social_tokens;
create policy "Athletes can view own social tokens"
  on public.athlete_social_tokens for select
  using (athlete_id = auth.uid());

-- Writes (INSERT / UPDATE / DELETE) are performed by server-side API
-- routes using the service role key — no athlete-facing write policies.


-- ─────────────────────────────────────────────────────────────────
-- 3. school_email_verifications — stores one-time 6-digit OTP codes
--    for school email verification. Service role only; athletes never
--    read their own codes directly (security).
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.school_email_verifications (
  id         uuid        default gen_random_uuid() primary key,
  athlete_id uuid        references public.profiles(id) on delete cascade not null,
  email      text        not null,
  code       text        not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz default now()
);

create index if not exists school_email_verifications_athlete_created_idx
  on public.school_email_verifications(athlete_id, created_at desc);

alter table public.school_email_verifications enable row level security;

-- No athlete-facing read policy — API routes use service role key.


-- ─────────────────────────────────────────────────────────────────
-- 4. Update upsert_athlete_profile_section RPC
--    Replace other_platform with youtube in INSERT and ON CONFLICT.
-- ─────────────────────────────────────────────────────────────────

create or replace function public.upsert_athlete_profile_section(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid  uuid  := auth.uid();
  prof jsonb := coalesce(payload -> 'profile', '{}'::jsonb);
  socs jsonb := coalesce(payload -> 'socials',  '{}'::jsonb);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles set
    bio                 = coalesce(prof ->> 'bio',                 bio),
    banner_url          = coalesce(prof ->> 'banner_url',          banner_url),
    availability_status = coalesce(prof ->> 'availability_status', availability_status)
  where id = uid;

  insert into public.athlete_socials (
    athlete_id, instagram, tiktok, twitter, youtube
  ) values (
    uid,
    coalesce(socs ->> 'instagram', ''),
    coalesce(socs ->> 'tiktok',    ''),
    coalesce(socs ->> 'twitter',   ''),
    coalesce(socs ->> 'youtube',   '')
  )
  on conflict (athlete_id) do update set
    instagram = excluded.instagram,
    tiktok    = excluded.tiktok,
    twitter   = excluded.twitter,
    youtube   = excluded.youtube;
end;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 5. Update get_athlete_onboarding_state RPC
--    Swap other_platform → youtube in the socials subquery.
-- ─────────────────────────────────────────────────────────────────

create or replace function public.get_athlete_onboarding_state()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select jsonb_build_object(
    'basics', (
      select jsonb_build_object(
        'full_name',          p.full_name,
        'email',              p.email,
        'alternate_email',    p.alternate_email,
        'phone',              p.phone,
        'contact_preference', p.contact_preference,
        'country',            p.country
      )
      from public.profiles p where p.id = uid
    ),
    'athletic', jsonb_build_object(
      'sports', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',           s.id,
          'sport',        s.sport,
          'position',     s.position,
          'jersey_number',s.jersey_number,
          'is_primary',   s.is_primary
        ))
        from public.athlete_sports s
        where s.athlete_id = uid
      ), '[]'::jsonb)
    ),
    'academic', (
      select jsonb_build_object(
        'school',             a.school,
        'school_domain',      a.school_domain,
        'school_email',       a.school_email,
        'current_year',       a.current_year,
        'eligibility_status', a.eligibility_status,
        'eligibility_years',  a.eligibility_years
      )
      from public.athlete_academics a where a.athlete_id = uid
    ),
    'compliance', (
      select jsonb_build_object(
        'school_email_verified', a.school_email_verified,
        'id_verified',           a.id_verified,
        'aco_email',             a.aco_email,
        'nil_disclosure_required', a.nil_disclosure_required
      )
      from public.athlete_academics a where a.athlete_id = uid
    ),
    'profile', (
      select jsonb_build_object(
        'bio',                    p.bio,
        'avatar_url',             p.avatar_url,
        'banner_url',             p.banner_url,
        'availability_status',    p.availability_status,
        'onboarding_completed_at',p.onboarding_completed_at
      )
      from public.profiles p where p.id = uid
    ),
    'socials', (
      select jsonb_build_object(
        'instagram', s.instagram,
        'tiktok',    s.tiktok,
        'twitter',   s.twitter,
        'youtube',   s.youtube
      )
      from public.athlete_socials s where s.athlete_id = uid
    )
  )
  into result;

  return result;
end;
$$;
