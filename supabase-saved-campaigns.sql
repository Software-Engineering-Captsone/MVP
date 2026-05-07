-- NILINK athlete Explore: persist saved campaign bookmarks.
--
-- Run this once in Supabase SQL editor for environments that already ran the
-- original business setup before saved_campaigns existed.

create table if not exists public.saved_campaigns (
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  saved_at    timestamptz not null default now(),
  primary key (athlete_id, campaign_id)
);

alter table public.saved_campaigns enable row level security;

grant select, insert, update, delete on public.saved_campaigns to authenticated;

drop policy if exists "Athletes manage own saved campaigns" on public.saved_campaigns;
create policy "Athletes manage own saved campaigns"
  on public.saved_campaigns for all
  using ((select auth.uid()) = athlete_id)
  with check ((select auth.uid()) = athlete_id);
