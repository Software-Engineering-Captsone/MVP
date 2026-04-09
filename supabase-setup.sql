-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Database Setup (Athlete Side)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE (shared by athletes + brands)
-- ─────────────────────────────────────────────────────────────────
-- Universal user fields that BOTH athletes and brands need.
-- Role-specific data goes in dedicated tables (athlete_* / brand_*)
-- so neither side carries null columns meant for the other.
--
-- Elevations over previous version:
--   • alternate_email      → onboarding collects this; backup contact
--   • city + state         → "Athletes Near You" feature needs granular
--                            location, not just country. Brands filter
--                            by region for local campaigns.
--   • availability_status  → brands filter "open to deals" instantly
--   • onboarding_completed_at → hide incomplete profiles from discovery
--   • verified             → platform-level badge (separate from .edu)
--   • banner_url           → profile hero image, distinct from avatar
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                      uuid references auth.users(id) on delete cascade primary key,
  email                   text not null,
  alternate_email         text default '',
  full_name               text not null default '',
  role                    text not null check (role in ('athlete', 'brand')) default 'athlete',
  phone                   text default '',
  contact_preference      text check (contact_preference in ('email', 'phone', 'both')) default 'email',
  country                 text default 'United States',
  state                   text default '',
  city                    text default '',
  avatar_url              text default '',
  banner_url              text default '',
  bio                     text default '',
  availability_status     text check (availability_status in ('available', 'busy', 'not_looking')) default 'available',
  verified                boolean default false,
  onboarding_completed_at timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_availability on public.profiles(availability_status)
  where role = 'athlete';

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Brands browse athlete profiles; athletes browse brand profiles
create policy "Public profiles are visible"
  on public.profiles for select
  using (onboarding_completed_at is not null);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'role', 'athlete')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Reusable updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- 2. ATHLETE_SPORTS TABLE (one-to-many)
-- ─────────────────────────────────────────────────────────────────
-- Each row = one sport an athlete plays. Brands search/filter by
-- sport, so this MUST be a real table (not a JSON array or text
-- column) — Postgres can index it, join on it, and aggregate it.
--
-- Elevations:
--   • is_primary           → brands searching "Basketball" get athletes
--                            who main it, not someone who tried it once
--   • jersey_number        → per-sport (a multi-sport athlete may have
--                            different numbers); brands use it for
--                            personalized campaigns ("Get #23's deal!")
--   • unique(athlete_id, sport) → prevents duplicate entries at DB level
--   • indexes on sport + athlete_id → fast cross-athlete filtering
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.athlete_sports (
  id             uuid default gen_random_uuid() primary key,
  athlete_id     uuid references public.profiles(id) on delete cascade not null,
  sport          text not null,
  position       text default '',
  jersey_number  text default '',
  is_primary     boolean default false,
  created_at     timestamptz default now(),

  unique (athlete_id, sport)
);

create index if not exists idx_athlete_sports_athlete on public.athlete_sports(athlete_id);
create index if not exists idx_athlete_sports_sport on public.athlete_sports(sport);

-- RLS
alter table public.athlete_sports enable row level security;

create policy "Athletes can manage own sports"
  on public.athlete_sports for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy "Anyone can view athlete sports"
  on public.athlete_sports for select
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- 3. ATHLETE_ACADEMICS TABLE (one-to-one)
-- ─────────────────────────────────────────────────────────────────
-- School, academic info, AND NIL compliance in one table because:
--   a) Only athletes have this (brands don't → zero null columns)
--   b) Compliance rules are tied to the school
--   c) Changes independently from profile (transfers, year changes)
--
-- School email verification flow:
--   1. Athlete enters .edu email (or we auto-detect from signup)
--   2. Verification link sent to that .edu address
--   3. Clicked → school_email_verified = true
--   4. Brands can filter "verified students only"
--
-- Elevations:
--   • school_email_verified    → THE trust gate. Athletes MUST verify
--                                before appearing in brand discovery.
--   • school_email_verified_at → timestamp for annual re-verification
--   • major                    → brands target by major for campaigns
--                                (e.g., a finance brand targets business
--                                majors; a tech brand targets CS majors)
--   • graduation_year (int)    → "2027" doesn't go stale like "Junior"
--                                does after a year. Brands can compute
--                                remaining time automatically.
--   • current_year still kept  → for display ("Junior") alongside the
--                                computed graduation_year
--   • eligibility_years as int → sortable/filterable numerically
--   • nil_disclosure_required  → boolean, not a 'yes'/'no' string
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.athlete_academics (
  id                       uuid default gen_random_uuid() primary key,
  athlete_id               uuid references public.profiles(id) on delete cascade not null unique,
  school                   text default '',
  school_domain            text default '',
  school_email             text default '',
  school_email_verified    boolean default false,
  school_email_verified_at timestamptz,
  major                    text default '',
  current_year             text check (current_year in (
                             'Freshman', 'Sophomore', 'Junior', 'Senior',
                             'Graduate / 5th Year', 'Redshirt', ''
                           )) default '',
  graduation_year          integer check (graduation_year >= 2020 and graduation_year <= 2040),
  eligibility_status       text check (eligibility_status in (
                             'Active', 'Inactive', 'Pending', 'Graduated', ''
                           )) default '',
  eligibility_years        integer check (eligibility_years >= 0 and eligibility_years <= 6),
  -- NIL Compliance (tied to school)
  id_verified              boolean default false,
  aco_email                text default '',
  nil_disclosure_required  boolean default false,
  updated_at               timestamptz default now()
);

create index if not exists idx_athlete_academics_school on public.athlete_academics(school);
create index if not exists idx_athlete_academics_verified on public.athlete_academics(school_email_verified)
  where school_email_verified = true;

-- RLS
alter table public.athlete_academics enable row level security;

create policy "Athletes can manage own academics"
  on public.athlete_academics for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy "Anyone can view athlete academics"
  on public.athlete_academics for select
  using (true);

drop trigger if exists on_academics_updated on public.athlete_academics;
create trigger on_academics_updated
  before update on public.athlete_academics
  for each row execute procedure public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- 4. ATHLETE_SOCIALS TABLE (one-to-one)
-- ─────────────────────────────────────────────────────────────────
-- Social handles, follower counts, and engagement metrics.
-- Separated from profiles because:
--   a) Updates frequently (follower counts change)
--   b) Brands query this independently for discovery/ranking
--   c) Only athletes have this data
--
-- Elevations:
--   • Followers as INTEGER   → your current code stores these as strings
--                              ("51.3K"). Integers enable WHERE, ORDER BY,
--                              range filters. No more parsing strings.
--   • total_followers GENERATED → auto-computed sum, always in sync,
--                              zero maintenance. One column to sort by.
--   • Per-platform engagement → instagram_engagement, tiktok_engagement,
--                              etc. A brand looking for TikTok creators
--                              cares about TikTok engagement specifically,
--                              not just the overall average.
--   • avg_likes / avg_views  → brands evaluate content quality by these.
--   • posts_per_month        → brands want active creators, not dormant
--                              accounts with old follower counts.
--   • total_views            → video-first platforms (TikTok) care about
--                              views more than followers.
--   • facebook included      → your mockData Athlete has facebook stats;
--                              avoiding a migration to add it later.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.athlete_socials (
  id                      uuid default gen_random_uuid() primary key,
  athlete_id              uuid references public.profiles(id) on delete cascade not null unique,
  -- Instagram
  instagram               text default '',
  instagram_followers     integer default 0,
  instagram_engagement    numeric(5,2) default 0.00,
  instagram_avg_likes     integer default 0,
  -- TikTok
  tiktok                  text default '',
  tiktok_followers        integer default 0,
  tiktok_engagement       numeric(5,2) default 0.00,
  tiktok_avg_views        integer default 0,
  -- Twitter / X
  twitter                 text default '',
  twitter_followers       integer default 0,
  twitter_engagement      numeric(5,2) default 0.00,
  -- Facebook
  facebook                text default '',
  facebook_followers      integer default 0,
  -- Other
  other_platform          text default '',
  other_followers         integer default 0,
  -- Aggregates (auto-computed or manually set)
  total_followers         integer generated always as (
                            coalesce(instagram_followers, 0) +
                            coalesce(tiktok_followers, 0) +
                            coalesce(twitter_followers, 0) +
                            coalesce(facebook_followers, 0) +
                            coalesce(other_followers, 0)
                          ) stored,
  engagement_rate         numeric(5,2) default 0.00,
  posts_per_month         integer default 0,
  total_views             bigint default 0,
  estimated_impressions   bigint default 0,
  updated_at              timestamptz default now()
);

create index if not exists idx_athlete_socials_total on public.athlete_socials(total_followers desc);
create index if not exists idx_athlete_socials_engagement on public.athlete_socials(engagement_rate desc);

-- RLS
alter table public.athlete_socials enable row level security;

create policy "Athletes can manage own socials"
  on public.athlete_socials for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy "Anyone can view athlete socials"
  on public.athlete_socials for select
  using (true);

drop trigger if exists on_socials_updated on public.athlete_socials;
create trigger on_socials_updated
  before update on public.athlete_socials
  for each row execute procedure public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- 5. ATHLETE_ACHIEVEMENTS TABLE (one-to-many)
-- ─────────────────────────────────────────────────────────────────
-- Your mockData has achievements as string[]. A separate table
-- instead of a text[] column because:
--   a) Brands may want to search by achievement type
--      ("show me All-Conference athletes")
--   b) Each achievement can have context (year, sport it relates to)
--   c) Orderable — athlete controls which achievements show first
--   d) No array manipulation needed — simple INSERT/DELETE
--
-- Elevations:
--   • year          → "2024 All-Conference" is more impressive than
--                     an undated one. Brands see recency.
--   • display_order → athlete controls what shows first on their
--                     profile card (most impressive at top)
--   • sport_id FK   → optional link to athlete_sports, so the
--                     achievement shows under the right sport
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.athlete_achievements (
  id             uuid default gen_random_uuid() primary key,
  athlete_id     uuid references public.profiles(id) on delete cascade not null,
  title          text not null,
  year           integer check (year >= 2000 and year <= 2050),
  sport_id       uuid references public.athlete_sports(id) on delete set null,
  display_order  integer default 0,
  created_at     timestamptz default now()
);

create index if not exists idx_athlete_achievements_athlete on public.athlete_achievements(athlete_id);

-- RLS
alter table public.athlete_achievements enable row level security;

create policy "Athletes can manage own achievements"
  on public.athlete_achievements for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy "Anyone can view athlete achievements"
  on public.athlete_achievements for select
  using (true);


-- ─────────────────────────────────────────────────────────────────
-- 6. CONVERSATIONS TABLE (one-to-many with messages)
-- ─────────────────────────────────────────────────────────────────
-- A conversation is a thread between exactly two users (athlete ↔
-- brand). This is the parent record — messages belong to it.
--
-- Why a separate table instead of just messages?
--   a) Inbox list needs metadata (last message preview, unread count)
--      without scanning every message row
--   b) Both sides (athlete inbox + brand inbox) query the same table
--      using participant_one / participant_two
--   c) Archiving or muting is per-conversation, not per-message
--
-- Elevations:
--   • participant_one + participant_two → explicit FK pair. Ordered so
--     participant_one < participant_two to enforce a unique pair
--     (no duplicate threads between same users).
--   • last_message_at       → sort inbox by most recent activity without
--                             joining messages table
--   • last_message_preview  → show preview text in inbox list without
--                             a subquery on messages
--   • unread counts per side → each participant tracks their own unread
--                             count independently
--   • archived per side     → athlete can archive without affecting brand's view
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id                          uuid default gen_random_uuid() primary key,
  participant_one             uuid references public.profiles(id) on delete cascade not null,
  participant_two             uuid references public.profiles(id) on delete cascade not null,
  last_message_at             timestamptz default now(),
  last_message_preview        text default '',
  participant_one_unread      integer default 0,
  participant_two_unread      integer default 0,
  participant_one_archived    boolean default false,
  participant_two_archived    boolean default false,
  created_at                  timestamptz default now(),

  -- Prevent duplicate threads between same two users
  unique (participant_one, participant_two),
  -- Ensure participant_one < participant_two for consistent ordering
  check (participant_one < participant_two)
);

create index if not exists idx_conversations_p1 on public.conversations(participant_one);
create index if not exists idx_conversations_p2 on public.conversations(participant_two);
create index if not exists idx_conversations_last_msg on public.conversations(last_message_at desc);

-- RLS: users can only see conversations they are part of
alter table public.conversations enable row level security;

create policy "Users can view own conversations"
  on public.conversations for select
  using (auth.uid() = participant_one or auth.uid() = participant_two);

create policy "Users can insert conversations they belong to"
  on public.conversations for insert
  with check (auth.uid() = participant_one or auth.uid() = participant_two);

create policy "Users can update own conversations"
  on public.conversations for update
  using (auth.uid() = participant_one or auth.uid() = participant_two);


-- ─────────────────────────────────────────────────────────────────
-- 7. MESSAGES TABLE (belongs to a conversation)
-- ─────────────────────────────────────────────────────────────────
-- Individual messages within a conversation. Supports:
--   • Plain text messages
--   • Deal offers (with structured terms in deal_terms JSONB)
--   • Future: attachments, images, contract shares
--
-- Why JSONB for deal_terms instead of a separate table?
--   a) Deal terms are always read WITH the message — never queried alone
--   b) Structure varies (different deliverables, compensation formats)
--   c) Avoids a join for every message render in the chat
--   d) Contract agreement/share can be added later to the same JSONB
--      without any migration
--
-- Elevations:
--   • message_type enum      → your mockData has 'text', 'deal_offer',
--                              'deal_counter', 'deal_accepted'. Extensible
--                              for future types (attachment, contract_share)
--   • deal_terms JSONB       → structured deal data only present on
--                              deal_offer/deal_counter messages:
--                              { duration, deliverables[], compensation }
--   • read_at timestamp      → more useful than boolean. Tells you
--                              WHEN they read it (for read receipts)
--   • edited_at              → if you ever allow message editing
--   • index on (conversation_id, created_at) → chat history loads fast
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id                uuid default gen_random_uuid() primary key,
  conversation_id   uuid references public.conversations(id) on delete cascade not null,
  sender_id         uuid references public.profiles(id) on delete cascade not null,
  message_type      text not null check (message_type in (
                      'text', 'deal_offer', 'deal_counter', 'deal_accepted',
                      'deal_declined', 'attachment', 'system'
                    )) default 'text',
  content           text not null default '',
  deal_terms        jsonb,
  read_at           timestamptz,
  edited_at         timestamptz,
  created_at        timestamptz default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);
create index if not exists idx_messages_sender on public.messages(sender_id);

-- RLS: users can only see messages in their conversations
alter table public.messages enable row level security;

create policy "Users can view messages in own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_one = auth.uid() or c.participant_two = auth.uid())
    )
  );

create policy "Users can send messages in own conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_one = auth.uid() or c.participant_two = auth.uid())
    )
  );


-- ═══════════════════════════════════════════════════════════════════
-- RELATIONSHIP MAP
-- ═══════════════════════════════════════════════════════════════════
--
--   auth.users (Supabase managed)
--       │
--       └──→ profiles (1:1, auto-created by trigger)
--               │
--               ├──→ athlete_sports       (1:many — one row per sport)
--               │       │
--               │       └──→ athlete_achievements.sport_id (optional FK)
--               │
--               ├──→ athlete_academics    (1:1 — school + NIL compliance)
--               ├──→ athlete_socials      (1:1 — handles + metrics)
--               ├──→ athlete_achievements (1:many — awards, honors)
--               │
--               ├──→ conversations        (many — as participant_one or _two)
--               │       │
--               │       └──→ messages     (1:many — chat messages)
--               │
--               └──→ messages.sender_id   (who sent each message)
--
-- ═══════════════════════════════════════════════════════════════════
-- FUTURE BUSINESS-SIDE TABLES (will FK to profiles.id):
--   • brand_profiles    (company name, industry, logo, budget range)
--   • campaigns         (brand creates; targets sport, location, etc.)
--   • applications      (athlete applies to campaign)
--   • deals             (finalized brand ↔ athlete agreement + terms)
--   • saved_athletes    (brand bookmarks athletes for later)
-- ═══════════════════════════════════════════════════════════════════

