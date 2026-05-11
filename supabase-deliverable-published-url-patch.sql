-- Add published_url column to deal_deliverables so athletes can attach a link
-- when they mark a publish-required deliverable as published.
ALTER TABLE deal_deliverables
  ADD COLUMN IF NOT EXISTS published_url text;
