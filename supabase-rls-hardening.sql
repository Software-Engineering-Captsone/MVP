-- ═══════════════════════════════════════════════════════════════════
-- NILINK — RLS Hardening: require authentication for directory reads
-- Run in Supabase Dashboard → SQL Editor → New Query
--
-- The initial setup scripts shipped permissive SELECT policies so the
-- landing surface could sample data without a session. For production,
-- directory reads (profiles, brand profiles, athlete sub-tables,
-- campaigns) must be gated to authenticated users.
--
-- Idempotent: each block checks that the target table exists before
-- touching its policy, so partial schemas don't error. Safe to run
-- multiple times. Predicates are preserved exactly from the setup
-- scripts — only the role gate (`to authenticated`) is added.
-- ═══════════════════════════════════════════════════════════════════

-- Helper: apply policy DDL only when the target table exists.
-- Using a DO block so missing tables no-op instead of aborting the run.


-- ─────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles') then
    drop policy if exists "Public profiles are visible" on public.profiles;
    drop policy if exists "Authenticated users view completed profiles" on public.profiles;
    execute $policy$
      create policy "Authenticated users view completed profiles"
        on public.profiles for select
        to authenticated
        using (onboarding_completed_at is not null)
    $policy$;
  end if;
end$$;


-- ─────────────────────────────────────────────────────────────────
-- brand_profiles
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'brand_profiles') then
    drop policy if exists "Anyone can view brand profiles" on public.brand_profiles;
    drop policy if exists "Authenticated users view brand profiles" on public.brand_profiles;
    execute $policy$
      create policy "Authenticated users view brand profiles"
        on public.brand_profiles for select
        to authenticated
        using (true)
    $policy$;
  end if;
end$$;


-- ─────────────────────────────────────────────────────────────────
-- athlete_sports
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'athlete_sports') then
    drop policy if exists "Anyone can view athlete sports" on public.athlete_sports;
    drop policy if exists "Authenticated users view athlete sports" on public.athlete_sports;
    execute $policy$
      create policy "Authenticated users view athlete sports"
        on public.athlete_sports for select
        to authenticated
        using (true)
    $policy$;
  end if;
end$$;


-- ─────────────────────────────────────────────────────────────────
-- athlete_academics
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'athlete_academics') then
    drop policy if exists "Anyone can view athlete academics" on public.athlete_academics;
    drop policy if exists "Authenticated users view athlete academics" on public.athlete_academics;
    execute $policy$
      create policy "Authenticated users view athlete academics"
        on public.athlete_academics for select
        to authenticated
        using (true)
    $policy$;
  end if;
end$$;


-- ─────────────────────────────────────────────────────────────────
-- athlete_socials
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'athlete_socials') then
    drop policy if exists "Anyone can view athlete socials" on public.athlete_socials;
    drop policy if exists "Authenticated users view athlete socials" on public.athlete_socials;
    execute $policy$
      create policy "Authenticated users view athlete socials"
        on public.athlete_socials for select
        to authenticated
        using (true)
    $policy$;
  end if;
end$$;


-- ─────────────────────────────────────────────────────────────────
-- athlete_achievements
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'athlete_achievements') then
    drop policy if exists "Anyone can view athlete achievements" on public.athlete_achievements;
    drop policy if exists "Authenticated users view athlete achievements" on public.athlete_achievements;
    execute $policy$
      create policy "Authenticated users view athlete achievements"
        on public.athlete_achievements for select
        to authenticated
        using (true)
    $policy$;
  end if;
end$$;


-- ─────────────────────────────────────────────────────────────────
-- athlete_content
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'athlete_content') then
    drop policy if exists "Anyone can view athlete content" on public.athlete_content;
    drop policy if exists "Authenticated users view athlete content" on public.athlete_content;
    execute $policy$
      create policy "Authenticated users view athlete content"
        on public.athlete_content for select
        to authenticated
        using (true)
    $policy$;
  end if;
end$$;


-- ─────────────────────────────────────────────────────────────────
-- campaigns
-- Predicate preserved from supabase-business-setup.sql:285-288
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'campaigns') then
    drop policy if exists "Anyone can view open public campaigns" on public.campaigns;
    drop policy if exists "Authenticated users view open public campaigns" on public.campaigns;
    execute $policy$
      create policy "Authenticated users view open public campaigns"
        on public.campaigns for select
        to authenticated
        using (
          visibility = 'Public'
          and status in ('Open for Applications', 'Reviewing Candidates')
        )
    $policy$;
  end if;
end$$;


-- ─────────────────────────────────────────────────────────────────
-- Report which tables were skipped (missing).
-- ─────────────────────────────────────────────────────────────────
do $$
declare
  missing text;
begin
  select string_agg(t, ', ') into missing
  from (values
    ('profiles'), ('brand_profiles'),
    ('athlete_sports'), ('athlete_academics'), ('athlete_socials'),
    ('athlete_achievements'), ('athlete_content'),
    ('campaigns')
  ) as v(t)
  where not exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = v.t
  );

  if missing is not null then
    raise notice 'Skipped (tables not present): %', missing;
  else
    raise notice 'All directory tables hardened.';
  end if;
end$$;
