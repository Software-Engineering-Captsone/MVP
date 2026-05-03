-- ═══════════════════════════════════════════════════════════════════
-- NILINK — Campaign Templates Setup
-- Run this in Supabase Dashboard → SQL Editor → New Query.
-- Depends on supabase-setup.sql (profiles) and supabase-business-setup.sql
-- (brand_profiles, campaigns, handle_updated_at trigger function).
--
-- Adds a single table for brand-owned campaign templates. System
-- (curated) templates remain in application code — they don't need a
-- DB row because they're versioned with the codebase and identical for
-- every brand. This table only stores user-saved presets.
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. CAMPAIGN_TEMPLATES — per-brand saved presets
-- ─────────────────────────────────────────────────────────────────
-- One row per saved template owned by a brand. `defaults` holds the
-- full CampaignBriefV2 JSON payload that the wizard rehydrates from.
-- `version` bumps when the same template name is overwritten.
-- `locked_paths` is reserved for future "do not let the wizard
-- override these fields" support; today the column is accepted but
-- optional.
--
-- Decisions locked in:
--   • Per-brand ownership only. Per-org templates wait until orgs are
--     modeled in profiles/brand_profiles.
--   • System templates are NOT stored here — they're built in code via
--     buildSeedSystemCampaignTemplates() and merged at read time.
--   • RLS: a brand can only see and mutate its own rows. No public read.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.campaign_templates (
  id                  uuid primary key default gen_random_uuid(),
  brand_id            uuid not null references public.brand_profiles(brand_id) on delete cascade,
  name                text not null,
  description         text default '',
  version             integer not null default 1 check (version >= 1),
  status              text not null default 'active' check (status in ('active','archived')),
  defaults            jsonb not null,
  locked_paths        text[] default null,
  source_campaign_id  uuid references public.campaigns(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists campaign_templates_brand_idx
  on public.campaign_templates (brand_id, status);

drop trigger if exists on_campaign_template_updated on public.campaign_templates;
create trigger on_campaign_template_updated
  before update on public.campaign_templates
  for each row execute function public.handle_updated_at();

alter table public.campaign_templates enable row level security;

drop policy if exists "Brands manage own templates" on public.campaign_templates;
create policy "Brands manage own templates"
  on public.campaign_templates for all
  using ((select auth.uid()) = brand_id)
  with check ((select auth.uid()) = brand_id);
