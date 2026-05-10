-- Add cancelled_at column required by enforce_deal_transitions() trigger
ALTER TABLE deals ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
