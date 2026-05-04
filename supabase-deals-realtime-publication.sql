-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Realtime: publish deal-related tables
-- Run in the SQL editor (or migrations) AFTER deals schema exists
-- (phase 4 deliverables, phase 5 activities, contract storage).
--
-- Required for client `postgres_changes` subscriptions (see
-- `src/lib/deals/useDealsRealtimeRefresh.ts`). Idempotent per table.
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  tbl text;
  tables text[] := array[
    'deals',
    'deal_contracts',
    'deal_payments',
    'deal_deliverables',
    'deliverable_submissions',
    'deal_activities'
  ];
begin
  foreach tbl in array tables
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
