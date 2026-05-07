-- NILINK campaigns: persist the structured V2 wizard payload.
--
-- Existing environments that already ran supabase-business-setup.sql need this
-- idempotent patch so draft resume and save-template can rehydrate the full
-- campaign brief instead of reconstructing it from legacy display columns.

alter table public.campaigns
  add column if not exists campaign_brief_v2 jsonb;
