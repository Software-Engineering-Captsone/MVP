-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Supabase Realtime: publish chat tables
-- Run in the SQL editor (or migrations) AFTER supabase-chat-setup.sql.
--
-- Required for client `postgres_changes` subscriptions in the shared
-- brand/athlete inbox. RLS on the chat tables still limits which rows a
-- signed-in user can receive.
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  tbl text;
  tables text[] := array[
    'chat_threads',
    'chat_participants',
    'chat_messages',
    'chat_thread_read_state'
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
