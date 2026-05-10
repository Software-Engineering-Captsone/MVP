-- Add cancellation_requested to deals status check constraint
ALTER TABLE deals DROP CONSTRAINT deals_status_check;
ALTER TABLE deals ADD CONSTRAINT deals_status_check CHECK (status IN (
  'created',
  'contract_pending',
  'active',
  'submission_in_progress',
  'under_review',
  'revision_requested',
  'approved_completed',
  'payment_pending',
  'paid',
  'closed',
  'cancelled',
  'cancellation_requested',
  'disputed'
));
