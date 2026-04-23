import type { SubmissionStatus } from './types';

export const SUBMISSION_ALLOWED_TRANSITIONS: Readonly<
  Record<SubmissionStatus, ReadonlySet<SubmissionStatus>>
> = {
  submitted: new Set(['viewed', 'approved', 'revision_requested', 'rejected']),
  viewed: new Set(['approved', 'revision_requested', 'rejected']),
  approved: new Set(),
  revision_requested: new Set(),
  rejected: new Set(),
};

export function assertSubmissionStatusTransition(
  from: SubmissionStatus,
  to: SubmissionStatus
): void {
  const allowed = SUBMISSION_ALLOWED_TRANSITIONS[from];
  if (!allowed?.has(to)) {
    throw new Error(`Invalid submission status transition: ${from} -> ${to}`);
  }
}
