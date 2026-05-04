-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Storage: deal-contracts bucket + RLS
-- Run in SQL Editor after deals tables exist (references public.deals).
--
-- Objects live at: {deal_id}/{uuid}_{safe_filename}
-- SELECT: brand + athlete on the deal (signed URLs also respect these policies).
-- INSERT / UPDATE / DELETE: brand on the deal only.
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit)
values ('deal-contracts', 'deal-contracts', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = coalesce(excluded.file_size_limit, storage.buckets.file_size_limit);

drop policy if exists "deal_contracts_select_participants" on storage.objects;
create policy "deal_contracts_select_participants"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'deal-contracts'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[1]
        and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)
    )
  );

drop policy if exists "deal_contracts_insert_brand" on storage.objects;
create policy "deal_contracts_insert_brand"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'deal-contracts'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[1]
        and (select auth.uid()) = d.brand_id
    )
  );

drop policy if exists "deal_contracts_update_brand" on storage.objects;
create policy "deal_contracts_update_brand"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'deal-contracts'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[1]
        and (select auth.uid()) = d.brand_id
    )
  )
  with check (
    bucket_id = 'deal-contracts'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[1]
        and (select auth.uid()) = d.brand_id
    )
  );

drop policy if exists "deal_contracts_delete_brand" on storage.objects;
create policy "deal_contracts_delete_brand"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'deal-contracts'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[1]
        and (select auth.uid()) = d.brand_id
    )
  );
