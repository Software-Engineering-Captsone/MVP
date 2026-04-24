-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Fix: infinite recursion between campaigns ↔ applications RLS
-- Run in Supabase Dashboard → SQL Editor → New Query
--
-- Problem: two policies cross-reference each other:
--
--   • applications."Brands review / update applications on own campaigns"
--     → subselect from public.campaigns (triggers campaigns RLS)
--   • campaigns."Applicants can view their campaigns"
--     → subselect from public.applications (triggers applications RLS)
--
-- Postgres evaluates policies when reading either table, so each query
-- calls the other's policy recursively and aborts with
-- "infinite recursion detected in policy for relation …".
--
-- Fix: replace the cross-table subqueries with SECURITY DEFINER helper
-- functions. SECURITY DEFINER runs with the function owner's rights and
-- bypasses RLS inside the function body — breaking the cycle. We set
-- search_path='' so the functions cannot be hijacked via search_path
-- manipulation, and we grant EXECUTE only to `authenticated` role.
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. Helper functions (SECURITY DEFINER, RLS-bypassing inside body)
-- ─────────────────────────────────────────────────────────────────

create or replace function public.user_is_campaign_brand(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaigns c
    where c.id = p_campaign_id
      and c.brand_id = auth.uid()
  );
$$;

create or replace function public.user_is_campaign_applicant(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applications a
    where a.campaign_id = p_campaign_id
      and a.athlete_id = auth.uid()
  );
$$;

-- Lock execution to signed-in users. The table owner (postgres) retains rights.
revoke all on function public.user_is_campaign_brand(uuid) from public;
revoke all on function public.user_is_campaign_applicant(uuid) from public;
grant execute on function public.user_is_campaign_brand(uuid) to authenticated;
grant execute on function public.user_is_campaign_applicant(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────
-- 2. Replace the recursive policies
-- ─────────────────────────────────────────────────────────────────

-- applications: Brands SELECT
drop policy if exists "Brands review applications on own campaigns" on public.applications;
create policy "Brands review applications on own campaigns"
  on public.applications for select
  using (public.user_is_campaign_brand(campaign_id));

-- applications: Brands UPDATE
drop policy if exists "Brands update applications on own campaigns" on public.applications;
create policy "Brands update applications on own campaigns"
  on public.applications for update
  using (public.user_is_campaign_brand(campaign_id))
  with check (
    public.user_is_campaign_brand(campaign_id)
    and status in ('pending','shortlisted','approved','declined')
  );

-- campaigns: applicants can view the campaigns they applied to
drop policy if exists "Applicants can view their campaigns" on public.campaigns;
create policy "Applicants can view their campaigns"
  on public.campaigns for select
  using (public.user_is_campaign_applicant(id));


-- ─────────────────────────────────────────────────────────────────
-- 3. Sanity notice
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  raise notice 'Recursion fix applied. Campaigns <-> applications policies now route via SECURITY DEFINER helpers.';
end$$;
