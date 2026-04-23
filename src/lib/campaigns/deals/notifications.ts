/**
 * Placeholder notification hooks — replace with email/push later.
 * Keep channels aligned with domain events (see `REQUIRED_DEAL_NOTIFICATION_CHANNELS`).
 */
export const REQUIRED_DEAL_NOTIFICATION_CHANNELS = [
  'deal_opened',
  'contract_uploaded',
  'contract_signed',
  'submission_submitted',
  'revision_requested',
  'submission_approved',
  'deliverable_completed',
  'deal_completed',
  'payment_pending',
  'payment_paid',
  'payment_status_changed',
  'deal_revision_blocked',
] as const;

export function notifyDealPlaceholder(
  channel: (typeof REQUIRED_DEAL_NOTIFICATION_CHANNELS)[number] | string,
  payload: Record<string, unknown>
): void {
  if (process.env.NODE_ENV !== 'production') {
    console.info('[deals:notify]', channel, payload);
  }
}
