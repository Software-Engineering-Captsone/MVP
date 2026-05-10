-- NILINK campaign/application flow simplification.
--
-- Run after the existing business, application, and RLS setup files.
-- Keeps legacy persisted values readable while allowing the canonical product
-- flow: Draft -> Active -> Applications -> Offer Drafts -> Offers Sent -> Deals.

alter table public.campaigns
  drop constraint if exists campaigns_status_check;

alter table public.campaigns
  add constraint campaigns_status_check
  check (
    status in (
      'Draft',
      'Ready to Launch',
      'Open for Applications',
      'Reviewing Candidates',
      'Deal Creation in Progress',
      'Active',
      'Completed',
      'Cancelled'
    )
  );

drop index if exists public.idx_campaigns_open_public;
create index if not exists idx_campaigns_open_public
  on public.campaigns(created_at desc)
  where visibility = 'Public'
    and accept_applications = true
    and status in ('Active','Open for Applications','Reviewing Candidates');

drop index if exists public.idx_campaigns_target_sport;
create index if not exists idx_campaigns_target_sport
  on public.campaigns(target_sport)
  where visibility = 'Public'
    and status in ('Active','Open for Applications','Reviewing Candidates');

create or replace function public.validate_application_campaign_open()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaigns c
    where c.id = new.campaign_id
      and c.visibility = 'Public'
      and c.accept_applications = true
      and c.status in ('Active','Open for Applications','Reviewing Candidates')
  ) then
    raise exception 'Campaign is not accepting applications';
  end if;
  return new;
end;
$$;

drop policy if exists "Anyone can view open public campaigns" on public.campaigns;
drop policy if exists "Authenticated users view open public campaigns" on public.campaigns;
create policy "Authenticated users view open public campaigns"
  on public.campaigns for select
  to authenticated
  using (
    visibility = 'Public'
    and status in ('Active','Open for Applications','Reviewing Candidates')
  );

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
      'offer_drafted',
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
      'offer_drafted',
      'declined',
      'offer_sent',
      'offer_declined'
    )
  );
