-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Storage Setup (Avatars Bucket)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Complements supabase-setup.sql (profiles.avatar_url stores the URL)
-- ═══════════════════════════════════════════════════════════════════

-- Public-read bucket; writes are gated by RLS policies below.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────
-- RLS policies on storage.objects
-- File path convention: <user_id>/avatar-<ts>.<ext>
-- The first folder segment MUST equal the uploader's auth.uid()
-- so users can only write inside their own folder.
-- ─────────────────────────────────────────────────────────────────

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Public can read avatars" on storage.objects;
create policy "Public can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');


-- ─────────────────────────────────────────────────────────────────
-- Profile Banner bucket
-- File path convention: <user_id>/banner-<ts>.<ext>
-- ─────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own banner" on storage.objects;
create policy "Users can upload own banner"
  on storage.objects for insert
  with check (
    bucket_id = 'banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own banner" on storage.objects;
create policy "Users can update own banner"
  on storage.objects for update
  using (
    bucket_id = 'banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own banner" on storage.objects;
create policy "Users can delete own banner"
  on storage.objects for delete
  using (
    bucket_id = 'banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Public can read banners" on storage.objects;
create policy "Public can read banners"
  on storage.objects for select
  using (bucket_id = 'banners');
