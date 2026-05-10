import type {
  StoredDeal,
  StoredDealContract,
  StoredDealPayment,
  StoredDeliverable,
  DealNextActor,
} from './types';

function allDeliverablesTerminal(rows: StoredDeliverable[]): boolean {
  if (rows.length === 0) return false;
  return rows.every((d) => d.status === 'completed');
}

function anyDeliverableNeedsAthlete(rows: StoredDeliverable[]): boolean {
  return rows.some((d) =>
    ['not_started', 'revision_requested'].includes(d.status) ||
    (d.status === 'approved' && d.publishRequired)
  );
}

function anyDeliverableNeedsPublication(rows: StoredDeliverable[]): boolean {
  return rows.some((d) => d.status === 'approved' && d.publishRequired);
}

function anyDeliverableInReview(rows: StoredDeliverable[]): boolean {
  return rows.some((d) => d.status === 'under_review' || d.status === 'draft_submitted');
}

/**
 * Computes dashboard next-step hints from frozen deal state + child rows.
 */
export function computeDealNextAction(args: {
  deal: StoredDeal;
  contract: StoredDealContract | null;
  payment: StoredDealPayment | null;
  deliverables: StoredDeliverable[];
}): { nextActionOwner: DealNextActor | null; nextActionLabel: string } {
  const { deal, contract, payment, deliverables } = args;
  const c = contract?.status ?? 'not_added';
  const p = payment?.status ?? 'not_configured';

  switch (deal.status) {
    case 'created':
      return { nextActionOwner: 'brand', nextActionLabel: 'Advance deal to contract phase' };
    case 'contract_pending':
      if (c === 'not_added') {
        return { nextActionOwner: 'brand', nextActionLabel: 'Add contract document' };
      }
      if (c === 'uploaded') {
        return { nextActionOwner: 'brand', nextActionLabel: 'Send contract for signature' };
      }
      if (c === 'sent_for_signature') {
        return { nextActionOwner: 'athlete', nextActionLabel: 'Review and sign contract' };
      }
      return { nextActionOwner: 'brand', nextActionLabel: 'Finalize and start deal' };
    case 'active':
      if (deliverables.length === 0) {
        return { nextActionOwner: 'brand', nextActionLabel: 'Add deliverables to begin work' };
      }
      if (anyDeliverableNeedsAthlete(deliverables)) {
        return {
          nextActionOwner: 'athlete',
          nextActionLabel: anyDeliverableNeedsPublication(deliverables) ? 'Publish approved content' : 'Work on deliverables',
        };
      }
      return { nextActionOwner: 'athlete', nextActionLabel: 'Submit draft for review' };
    case 'submission_in_progress':
      if (anyDeliverableNeedsPublication(deliverables)) {
        return { nextActionOwner: 'athlete', nextActionLabel: 'Publish approved content' };
      }
      return { nextActionOwner: 'athlete', nextActionLabel: 'Finish and submit for review' };
    case 'under_review':
      return { nextActionOwner: 'brand', nextActionLabel: 'Review latest submission' };
    case 'revision_requested':
      return { nextActionOwner: 'athlete', nextActionLabel: 'Apply revision feedback' };
    case 'approved_completed':
      return { nextActionOwner: 'brand', nextActionLabel: 'Confirm payout readiness' };
    case 'payment_pending':
      if (p === 'paid') {
        return { nextActionOwner: 'brand', nextActionLabel: 'Archive and close deal' };
      }
      if (p === 'ready_to_release') {
        return { nextActionOwner: 'brand', nextActionLabel: 'Release payout' };
      }
      if (p === 'manual' || p === 'pending' || p === 'awaiting_setup' || p === 'not_configured') {
        return { nextActionOwner: 'brand', nextActionLabel: 'Record payout' };
      }
      if (p === 'failed') {
        return { nextActionOwner: 'brand', nextActionLabel: 'Resolve payout issue' };
      }
      return { nextActionOwner: 'system', nextActionLabel: 'Complete payout setup' };
    case 'paid':
      return { nextActionOwner: 'brand', nextActionLabel: 'Archive and close deal' };
    case 'closed':
      return { nextActionOwner: null, nextActionLabel: 'No further actions' };
    case 'cancellation_requested':
      return { nextActionOwner: 'system', nextActionLabel: 'Cancellation pending — awaiting response' };
    case 'cancelled':
      return { nextActionOwner: null, nextActionLabel: 'Deal cancelled' };
    case 'disputed':
      return { nextActionOwner: 'system', nextActionLabel: 'Resolve dispute' };
    default:
      return { nextActionOwner: null, nextActionLabel: 'Update deal status' };
  }
}

/** Optional refinement when deliverables imply review state */
export function refineNextActionWithDeliverables(
  base: { nextActionOwner: DealNextActor | null; nextActionLabel: string },
  deal: StoredDeal,
  deliverables: StoredDeliverable[]
): { nextActionOwner: DealNextActor | null; nextActionLabel: string } {
  if (
    (deal.status === 'active' || deal.status === 'submission_in_progress') &&
    anyDeliverableInReview(deliverables)
  ) {
    return { nextActionOwner: 'brand', nextActionLabel: 'Review submitted deliverables' };
  }
  if (deal.status === 'approved_completed' && allDeliverablesTerminal(deliverables)) {
    return { nextActionOwner: 'brand', nextActionLabel: 'Move to payout' };
  }
  return base;
}
