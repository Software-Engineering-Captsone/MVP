-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Applications: add `under_review` status (brand review step)
-- Run in Supabase SQL Editor AFTER supabase-business-setup.sql.
--
-- Aligns DB with brand dashboard actions ("Move to review") while keeping
-- existing rows valid. This file intentionally preserves later offer
-- statuses too, so re-running it never narrows the application's lifecycle.
-- ═══════════════════════════════════════════════════════════════════

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (
    status in (
      'pending',
      'under_review',
      'shortlisted',
      'approved',
      'offer_sent',
      'offer_declined',
      'declined',
      'withdrawn'
    )
  );

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

revoke all on function public.is_campaign_brand_owner(uuid, uuid) from public;
grant execute on function public.is_campaign_brand_owner(uuid, uuid) to authenticated;

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
