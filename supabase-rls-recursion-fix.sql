-- NILINK backend hardening: remove campaigns/applications RLS recursion.
--
-- Run this once in Supabase SQL Editor for existing environments.
-- It is already folded into supabase-business-setup.sql for fresh setup.

create or replace function public.is_campaign_brand_owner(
  p_campaign_id uuid,
  p_brand_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.campaigns c
    where c.id = p_campaign_id
      and c.brand_id = p_brand_id
  );
$$;

create or replace function public.has_applied_to_campaign(
  p_campaign_id uuid,
  p_athlete_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.applications a
    where a.campaign_id = p_campaign_id
      and a.athlete_id = p_athlete_id
  );
$$;

revoke all on function public.is_campaign_brand_owner(uuid, uuid) from public;
revoke all on function public.has_applied_to_campaign(uuid, uuid) from public;
grant execute on function public.is_campaign_brand_owner(uuid, uuid) to authenticated;
grant execute on function public.has_applied_to_campaign(uuid, uuid) to authenticated;

drop policy if exists "Brands review applications on own campaigns" on public.applications;
create policy "Brands review applications on own campaigns"
  on public.applications for select
  using (
    public.is_campaign_brand_owner(campaign_id, (select auth.uid()))
  );

drop policy if exists "Brands update applications on own campaigns" on public.applications;
create policy "Brands update applications on own campaigns"
  on public.applications for update
  using (
    public.is_campaign_brand_owner(campaign_id, (select auth.uid()))
  )
  with check (
    public.is_campaign_brand_owner(campaign_id, (select auth.uid()))
    and status in (
      'pending',
      'under_review',
      'shortlisted',
      'approved',
      'declined',
      'offer_sent',
      'offer_declined'
    )
  );

drop policy if exists "Applicants can view their campaigns" on public.campaigns;
create policy "Applicants can view their campaigns"
  on public.campaigns for select
  using (
    public.has_applied_to_campaign(campaigns.id, (select auth.uid()))
  );
