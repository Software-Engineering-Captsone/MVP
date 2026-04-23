import type { ContractStatus, DealStatus } from './types';

/** Explicit allowed deal status transitions (from -> to). */
export const DEAL_ALLOWED_TRANSITIONS: Readonly<Record<DealStatus, ReadonlySet<DealStatus>>> = {
  created: new Set<DealStatus>(['contract_pending', 'cancelled', 'disputed']),
  contract_pending: new Set<DealStatus>(['active', 'cancelled', 'disputed']),
  active: new Set<DealStatus>([
    'submission_in_progress',
    'under_review',
    'cancelled',
    'disputed',
  ]),
  /** `approved_completed` allowed only when all deliverables are `completed` (enforced in repository). */
  submission_in_progress: new Set<DealStatus>(['under_review', 'approved_completed', 'cancelled', 'disputed']),
  under_review: new Set<DealStatus>([
    'revision_requested',
    'approved_completed',
    'cancelled',
    'disputed',
  ]),
  revision_requested: new Set<DealStatus>(['submission_in_progress', 'approved_completed', 'cancelled', 'disputed']),
  approved_completed: new Set<DealStatus>(['payment_pending', 'closed', 'cancelled', 'disputed']),
  payment_pending: new Set<DealStatus>(['paid', 'cancelled', 'disputed']),
  paid: new Set<DealStatus>(['closed', 'disputed']),
  closed: new Set<DealStatus>(),
  cancelled: new Set<DealStatus>(),
  disputed: new Set<DealStatus>(['active', 'cancelled', 'closed']),
};

export function assertDealStatusTransition(from: DealStatus, to: DealStatus): void {
  const allowed = DEAL_ALLOWED_TRANSITIONS[from];
  if (!allowed?.has(to)) {
    throw new Error(`Invalid deal status transition: ${from} -> ${to}`);
  }
}

export function dealTransitionRequiresSignedContract(from: DealStatus, to: DealStatus): boolean {
  return from === 'contract_pending' && to === 'active';
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
