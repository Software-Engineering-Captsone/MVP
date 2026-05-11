-- ═══════════════════════════════════════════════════════════════════
-- NILINK — ensure_athlete_profile()
-- Run in Supabase SQL Editor.
--
-- Problem this solves:
--   athlete_academics.athlete_id has a foreign key to profiles.id.
--   If the auto-create trigger (on_auth_user_created → handle_new_user)
--   ever fails or wasn't installed at the time a user signed up, that
--   user can authenticate but has no profiles row — and any subsequent
--   insert into athlete_academics / athlete_sports / athlete_socials
--   fails with a FK violation.
--
-- This RPC is idempotent: it inserts the missing profile row if absent,
-- using the caller's auth.users record as the source of truth. Safe to
-- call on every onboarding boot.
--
-- SECURITY DEFINER is used so this can read auth.users (which is in a
-- protected schema) without needing to grant the caller direct access.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.ensure_athlete_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  u   record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Fast path: row already exists.
  if exists (select 1 from public.profiles where id = uid) then
    return uid;
  end if;

  -- Backfill from auth.users (same source the on_auth_user_created
  -- trigger uses, so behavior matches a normal signup).
  select id, email, raw_user_meta_data
    into u
    from auth.users
   where id = uid;

  if not found then
    raise exception 'auth.users row missing for %', uid;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    u.id,
    u.email,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      split_part(coalesce(u.email, ''), '@', 1)
    ),
    coalesce(u.raw_user_meta_data ->> 'role', 'athlete')
  )
  on conflict (id) do nothing;

  return uid;
end;
$$;

grant execute on function public.ensure_athlete_profile() to authenticated;
