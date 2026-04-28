-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Brand referral invites (additive policy)
-- Run this in Supabase Dashboard → SQL Editor → New Query.
-- Depends on: supabase-business-setup.sql (applications table + policies)
--
-- Adds the missing brand-side INSERT policy so a brand can create an
-- application row on its own campaign as a referral invite. Existing
-- athlete INSERT/SELECT/UPDATE/DELETE policy is untouched.
--
-- Status is constrained to 'pending' so referrals enter the same review
-- queue as cold applications. (No schema columns added — we live with
-- the existing applications shape for the class-project scope.)
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Brands invite athletes to own campaigns" on public.applications;
create policy "Brands invite athletes to own campaigns"
  on public.applications for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.brand_id = (select auth.uid())
    )
    and status = 'pending'
  );
