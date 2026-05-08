-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Applications: `offer_sent` / `offer_declined` + transitions
-- Run in Supabase SQL Editor after supabase-business-setup.sql and
-- supabase-applications-under-review-status.sql (if used).
--
-- Allows syncing application status when a brand sends an offer
-- (`sendOfferDraftByBrand` updates approved/shortlisted → offer_sent).
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

create or replace function public.enforce_application_transitions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.campaign_id is distinct from new.campaign_id then
    raise exception 'applications.campaign_id is immutable';
  end if;
  if old.athlete_id is distinct from new.athlete_id then
    raise exception 'applications.athlete_id is immutable';
  end if;

  if old.status is distinct from new.status then
    if old.status = 'withdrawn' and new.status = 'pending' then
      new.decided_at := null;
      return new;
    end if;

    if old.status in ('declined', 'withdrawn', 'offer_declined') then
      raise exception 'Cannot change status of a % application', old.status;
    end if;

    if old.status = 'offer_sent' and new.status not in ('offer_sent', 'offer_declined') then
      raise exception 'Invalid transition from offer_sent to %', new.status;
    end if;

    if old.status = 'pending' and new.status <> 'pending' then
      new.decided_at := coalesce(new.decided_at, now());
    end if;
  end if;

  return new;
end;
$$;

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
