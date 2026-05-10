import type { ContractStatus, DealStatus } from './types';

/** Explicit allowed deal status transitions (from -> to). */
export const DEAL_ALLOWED_TRANSITIONS: Readonly<Record<DealStatus, ReadonlySet<DealStatus>>> = {
  created: new Set<DealStatus>(['contract_pending', 'cancelled', 'disputed']),
  contract_pending: new Set<DealStatus>(['active', 'cancelled', 'disputed']),
  active: new Set<DealStatus>(['submission_in_progress', 'under_review', 'cancelled', 'disputed', 'cancellation_requested']),
  /** `approved_completed` allowed only when all deliverables are `completed` (enforced in repository). */
  submission_in_progress: new Set<DealStatus>(['under_review', 'approved_completed', 'cancelled', 'disputed', 'cancellation_requested']),
  under_review: new Set<DealStatus>(['submission_in_progress', 'revision_requested', 'approved_completed', 'cancelled', 'disputed', 'cancellation_requested']),
  revision_requested: new Set<DealStatus>(['submission_in_progress', 'under_review', 'approved_completed', 'cancelled', 'disputed', 'cancellation_requested']),
  approved_completed: new Set<DealStatus>(['payment_pending', 'closed', 'cancelled', 'disputed', 'cancellation_requested']),
  payment_pending: new Set<DealStatus>(['paid', 'cancelled', 'disputed', 'cancellation_requested']),
  paid: new Set<DealStatus>(['closed', 'disputed']),
  closed: new Set<DealStatus>(),
  cancelled: new Set<DealStatus>(),
  cancellation_requested: new Set<DealStatus>(['cancelled', 'disputed']),
  disputed: new Set<DealStatus>(['active', 'cancelled', 'closed']),
};

export function assertDealStatusTransition(from: DealStatus, to: DealStatus): void {
  const allowed = DEAL_ALLOWED_TRANSITIONS[from];
  if (!allowed?.has(to)) {
    throw new Error(`Invalid deal status transition: ${from} -> ${to}`);
  }
}

export function dealTransitionRequiresSignedContract(from: DealStatus, to: DealStatus): boolean {
  return (from === 'contract_pending' || from === 'created') && to === 'active';
}

export function assertContractStatusTransition(from: ContractStatus, to: ContractStatus): void {
  const order: ContractStatus[] = ['not_added', 'uploaded', 'sent_for_signature', 'signed'];
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  if (fi < 0 || ti < 0) {
    throw new Error(`Invalid contract status: ${from} -> ${to}`);
  }
  if (ti < fi) {
    throw new Error(`Invalid contract status transition: ${from} -> ${to}`);
  }
  if (ti - fi > 1) {
    throw new Error(`Contract status must advance one step at a time: ${from} -> ${to}`);
  }
}
