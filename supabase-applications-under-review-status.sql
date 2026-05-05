-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Applications: add `under_review` status (brand review step)
-- Run in Supabase SQL Editor AFTER supabase-business-setup.sql.
--
-- Aligns DB with brand dashboard actions ("Move to review") while keeping
-- existing rows valid. Brand RLS allows the new status on UPDATE.
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
      'declined',
      'withdrawn'
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
    and status in ('pending', 'under_review', 'shortlisted', 'approved', 'declined')
  );
