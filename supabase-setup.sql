-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Database Setup
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE
-- Stores user profile data that extends the auth.users table.
-- One row per user, linked by auth.users.id.
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  role text check (role in ('athlete', 'brand')) default 'athlete',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. ROW LEVEL SECURITY (RLS)
-- Enable RLS so users can only read/update their own profile.
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Users can insert their own profile (for the trigger)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Service role can do anything (for the trigger function)
create policy "Service role full access"
  on public.profiles for all
  using (true)
  with check (true);

-- 3. AUTO-CREATE PROFILE ON SIGNUP
-- This trigger fires whenever a new user signs up in auth.users.
-- It creates a matching row in public.profiles using the metadata
-- passed during signUp({ data: { full_name, role } }).
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
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'athlete')
  );
  return new;
end;
$$;

-- Drop existing trigger if it exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. AUTO-UPDATE updated_at
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
