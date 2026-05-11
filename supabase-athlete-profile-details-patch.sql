-- NILINK — Athlete Brand-Facing Profile Details Patch
-- Run after the base athlete setup migrations. Idempotent and safe to rerun.
--
-- Adds/ensures the fields now maintained in the athlete Profile Editor:
--   • profiles.hometown
--   • athlete_academics.major
--   • athlete_achievements
--   • athlete_content

alter table public.profiles
  add column if not exists hometown text default '';

alter table public.athlete_academics
  add column if not exists major text default '';

create table if not exists public.athlete_achievements (
  id             uuid default gen_random_uuid() primary key,
  athlete_id     uuid references public.profiles(id) on delete cascade not null,
  title          text not null,
  year           integer check (year >= 2000 and year <= 2050),
  sport_id       uuid references public.athlete_sports(id) on delete set null,
  display_order  integer default 0,
  created_at     timestamptz default now()
);

create index if not exists idx_athlete_achievements_athlete
  on public.athlete_achievements(athlete_id);

alter table public.athlete_achievements enable row level security;

drop policy if exists "Athletes can manage own achievements" on public.athlete_achievements;
create policy "Athletes can manage own achievements"
  on public.athlete_achievements for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

drop policy if exists "Anyone can view athlete achievements" on public.athlete_achievements;
drop policy if exists "Authenticated users view athlete achievements" on public.athlete_achievements;
create policy "Authenticated users view athlete achievements"
  on public.athlete_achievements for select
  to authenticated
  using (true);

create table if not exists public.athlete_content (
  id             uuid default gen_random_uuid() primary key,
  athlete_id     uuid references public.profiles(id) on delete cascade not null,
  content_type   text not null check (content_type in ('image', 'video')),
  media_url      text not null,
  thumbnail_url  text default '',
  caption        text default '',
  overlay_text   text default '',
  views          integer default 0,
  likes          integer default 0,
  posted_at      date,
  sport_id       uuid references public.athlete_sports(id) on delete set null,
  display_order  integer default 0,
  created_at     timestamptz default now()
);

create index if not exists idx_athlete_content_athlete
  on public.athlete_content(athlete_id, posted_at desc);

create index if not exists idx_athlete_content_views
  on public.athlete_content(views desc);

alter table public.athlete_content enable row level security;

drop policy if exists "Athletes can manage own content" on public.athlete_content;
create policy "Athletes can manage own content"
  on public.athlete_content for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

drop policy if exists "Anyone can view athlete content" on public.athlete_content;
drop policy if exists "Authenticated users view athlete content" on public.athlete_content;
create policy "Authenticated users view athlete content"
  on public.athlete_content for select
  to authenticated
  using (true);
