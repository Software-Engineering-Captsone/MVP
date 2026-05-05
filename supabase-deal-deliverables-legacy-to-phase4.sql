-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Upgrade legacy `deal_deliverables` to Phase 4 shape
-- Run in Supabase SQL Editor when you see:
--   "Could not find the 'disclosure_required' column of 'deal_deliverables'"
--
-- Cause: `supabase-business-setup.sql` created an older `deal_deliverables`
-- row shape. `supabase-deals-phase4-setup.sql` uses CREATE TABLE IF NOT EXISTS,
-- so it never applied the new columns when that legacy table already existed.
--
-- Idempotent: safe to re-run. In Supabase, reload the API schema after running
-- (Settings → API → "Reload schema" or wait for cache refresh).
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Add Phase 4 columns ───

alter table public.deal_deliverables add column if not exists title text;
alter table public.deal_deliverables add column if not exists order_index integer;
alter table public.deal_deliverables add column if not exists type text;
alter table public.deal_deliverables add column if not exists instructions text;
alter table public.deal_deliverables add column if not exists due_at timestamptz;
alter table public.deal_deliverables add column if not exists draft_required boolean;
alter table public.deal_deliverables add column if not exists publish_required boolean;
alter table public.deal_deliverables add column if not exists proof_required boolean;
alter table public.deal_deliverables add column if not exists disclosure_required boolean;
alter table public.deal_deliverables add column if not exists revision_limit integer;
alter table public.deal_deliverables add column if not exists revision_count_used integer;

update public.deal_deliverables
set
  order_index = coalesce(order_index, 0),
  draft_required = coalesce(draft_required, false),
  publish_required = coalesce(publish_required, false),
  proof_required = coalesce(proof_required, false),
  disclosure_required = coalesce(disclosure_required, false),
  revision_limit = coalesce(revision_limit, 0),
  revision_count_used = coalesce(revision_count_used, 0);

-- Backfill from legacy `description` / `due_date` / `content_type` only when those columns exist
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deal_deliverables' and column_name = 'description'
  ) then
    execute $q$
      update public.deal_deliverables
      set
        title = coalesce(
          nullif(trim(title), ''),
          left(nullif(trim(description), ''), 200),
          'Deliverable'
        )
      where title is null or trim(title) = ''
    $q$;
    execute $q$
      update public.deal_deliverables
      set instructions = coalesce(nullif(trim(instructions), ''), nullif(trim(description), ''), '')
      where instructions is null or trim(instructions) = ''
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deal_deliverables' and column_name = 'due_date'
  ) then
    execute $q$
      update public.deal_deliverables
      set due_at = coalesce(due_at, due_date::timestamptz)
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deal_deliverables' and column_name = 'content_type'
  ) then
    execute $q$
      update public.deal_deliverables
      set type = case trim(content_type::text)
          when 'instagram_post' then 'instagram_post'
          when 'instagram_reel' then 'instagram_post'
          when 'instagram_story' then 'story'
          when 'tiktok' then 'tiktok_video'
          when 'youtube' then 'custom'
          when 'ugc_photo' then 'custom'
          when 'ugc_video' then 'custom'
          when 'other' then 'custom'
          else 'custom'
        end
      where type is null
    $q$;
  end if;
end $$;

update public.deal_deliverables
set title = coalesce(nullif(trim(title), ''), 'Deliverable')
where title is null or trim(title) = '';

update public.deal_deliverables set instructions = '' where instructions is null;

update public.deal_deliverables set type = 'custom' where type is null;

-- Drop all CHECK constraints so we can rewrite status / type domains
do $$
declare
  r record;
begin
  for r in
    select c.conname as conname
    from pg_constraint c
    where c.conrelid = 'public.deal_deliverables'::regclass
      and c.contype = 'c'
  loop
    execute format('alter table public.deal_deliverables drop constraint if exists %I', r.conname);
  end loop;
end $$;

-- Legacy status values → Phase 4
update public.deal_deliverables
set status = case trim(status::text)
    when 'pending' then 'not_started'
    when 'in_progress' then 'draft_submitted'
    when 'submitted' then 'under_review'
    when 'approved' then 'approved'
    when 'rejected' then 'revision_requested'
    when 'overdue' then 'not_started'
    else status
  end
where trim(status::text) in (
  'pending',
  'in_progress',
  'submitted',
  'approved',
  'rejected',
  'overdue'
);

update public.deal_deliverables set status = 'not_started' where status is null or trim(status::text) = '';

alter table public.deal_deliverables
  add constraint deal_deliverables_status_phase4_check
  check (
    status in (
      'not_started',
      'draft_submitted',
      'under_review',
      'revision_requested',
      'approved',
      'published',
      'completed'
    )
  );

alter table public.deal_deliverables
  add constraint deal_deliverables_type_phase4_check
  check (
    type in (
      'instagram_post',
      'tiktok_video',
      'story',
      'appearance_event',
      'meetup',
      'keynote',
      'custom'
    )
  );

update public.deal_deliverables set title = 'Deliverable' where title is null or trim(title) = '';
update public.deal_deliverables set instructions = '' where instructions is null;

alter table public.deal_deliverables alter column title set not null;
alter table public.deal_deliverables alter column order_index set not null;
alter table public.deal_deliverables alter column order_index set default 0;
alter table public.deal_deliverables alter column type set not null;
alter table public.deal_deliverables alter column instructions set not null;
alter table public.deal_deliverables alter column status set not null;
alter table public.deal_deliverables alter column draft_required set not null;
alter table public.deal_deliverables alter column draft_required set default false;
alter table public.deal_deliverables alter column publish_required set not null;
alter table public.deal_deliverables alter column publish_required set default false;
alter table public.deal_deliverables alter column proof_required set not null;
alter table public.deal_deliverables alter column proof_required set default false;
alter table public.deal_deliverables alter column disclosure_required set not null;
alter table public.deal_deliverables alter column disclosure_required set default false;
alter table public.deal_deliverables alter column revision_limit set not null;
alter table public.deal_deliverables alter column revision_limit set default 0;
alter table public.deal_deliverables alter column revision_count_used set not null;
alter table public.deal_deliverables alter column revision_count_used set default 0;

alter table public.deal_deliverables drop column if exists content_type;
