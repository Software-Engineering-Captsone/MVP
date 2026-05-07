-- NILINK athlete Applications: pitch history + withdrawn re-apply support.
--
-- Run this once in Supabase SQL editor after the base business setup.

alter table public.applications
  add column if not exists previous_pitch text;

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
