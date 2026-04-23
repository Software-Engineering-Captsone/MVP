-- ═══════════════════════════════════════════════════════════════════
-- NILINK — RLS Hardening: require authentication for directory reads
-- Run in Supabase Dashboard → SQL Editor → New Query
--
-- The initial setup scripts shipped permissive SELECT policies so the
-- landing surface could sample data without a session. For production,
-- directory reads (profiles, brand profiles, athlete sub-tables,
-- campaigns) must be gated to authenticated users. The public landing
-- page does not read these tables; all browsing happens inside
-- /dashboard where users are signed in.
--
-- Safe to run multiple times: each policy is dropped before recreate.
-- Predicates are preserved exactly — only the role gate is added.
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- profiles: browseable only when signed in
-- Predicate preserved from supabase-setup.sql:91
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Public profiles are visible" on public.profiles;
create policy "Authenticated users view completed profiles"
  on public.profiles for select
  to authenticated
  using (onboarding_completed_at is not null);


-- ─────────────────────────────────────────────────────────────────
-- brand_profiles: remove fully-public read
-- Predicate preserved from supabase-business-setup.sql:124
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can view brand profiles" on public.brand_profiles;
create policy "Authenticated users view brand profiles"
  on public.brand_profiles for select
  to authenticated
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- athlete_sports
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can view athlete sports" on public.athlete_sports;
create policy "Authenticated users view athlete sports"
  on public.athlete_sports for select
  to authenticated
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- athlete_academics
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can view athlete academics" on public.athlete_academics;
create policy "Authenticated users view athlete academics"
  on public.athlete_academics for select
  to authenticated
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- athlete_socials
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can view athlete socials" on public.athlete_socials;
create policy "Authenticated users view athlete socials"
  on public.athlete_socials for select
  to authenticated
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- athlete_achievements
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can view athlete achievements" on public.athlete_achievements;
create policy "Authenticated users view athlete achievements"
  on public.athlete_achievements for select
  to authenticated
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- athlete_content
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can view athlete content" on public.athlete_content;
create policy "Authenticated users view athlete content"
  on public.athlete_content for select
  to authenticated
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- campaigns: keep the exact predicate from the initial setup,
-- but require authentication.
-- Predicate preserved from supabase-business-setup.sql:285-288
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can view open public campaigns" on public.campaigns;
create policy "Authenticated users view open public campaigns"
  on public.campaigns for select
  to authenticated
  using (
    visibility = 'Public'
    and status in ('Open for Applications', 'Reviewing Candidates')
  );
