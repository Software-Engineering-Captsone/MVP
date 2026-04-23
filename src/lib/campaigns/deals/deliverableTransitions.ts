import type { DeliverableStatus } from './types';

export const DELIVERABLE_ALLOWED_TRANSITIONS: Readonly<
  Record<DeliverableStatus, ReadonlySet<DeliverableStatus>>
> = {
  not_started: new Set(['draft_submitted', 'under_review']),
  draft_submitted: new Set(['under_review', 'revision_requested', 'approved']),
  under_review: new Set(['revision_requested', 'approved', 'draft_submitted']),
  revision_requested: new Set(['draft_submitted', 'under_review', 'not_started']),
  approved: new Set(['published', 'completed']),
  published: new Set(['completed']),
  completed: new Set(),
};

export function assertDeliverableStatusTransition(
  from: DeliverableStatus,
  to: DeliverableStatus
): void {
  const allowed = DELIVERABLE_ALLOWED_TRANSITIONS[from];
  if (!allowed?.has(to)) {
    throw new Error(`Invalid deliverable status transition: ${from} -> ${to}`);
  }
}
