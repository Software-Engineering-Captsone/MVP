-- NILINK — Launch patch: persist self-reported Instagram/TikTok reach.
-- Run after supabase-onboarding-rpc.sql and supabase-social-oauth.sql.
-- This updates the existing onboarding/profile RPCs without changing table shape.

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
  instagram_followers integer := greatest(
    0,
    coalesce(nullif(regexp_replace(coalesce(socs ->> 'instagram_followers', ''), '\D', '', 'g'), '')::integer, 0)
  );
  tiktok_followers integer := greatest(
    0,
    coalesce(nullif(regexp_replace(coalesce(socs ->> 'tiktok_followers', ''), '\D', '', 'g'), '')::integer, 0)
  );
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
    athlete_id, instagram, instagram_followers, tiktok, tiktok_followers, twitter, youtube
  ) values (
    uid,
    coalesce(socs ->> 'instagram', ''),
    instagram_followers,
    coalesce(socs ->> 'tiktok',    ''),
    tiktok_followers,
    coalesce(socs ->> 'twitter',   ''),
    coalesce(socs ->> 'youtube',   '')
  )
  on conflict (athlete_id) do update set
    instagram           = excluded.instagram,
    instagram_followers = excluded.instagram_followers,
    tiktok              = excluded.tiktok,
    tiktok_followers    = excluded.tiktok_followers,
    twitter             = excluded.twitter,
    youtube             = excluded.youtube;
end;
$$;

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
        'instagram_followers', s.instagram_followers,
        'tiktok', s.tiktok,
        'tiktok_followers', s.tiktok_followers,
        'twitter', s.twitter,
        'youtube', s.youtube
      )
      from public.athlete_socials s where s.athlete_id = uid
    )
  )
  into result;

  return result;
end;
$$;
