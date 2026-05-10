import type { PaymentStatus } from './types';

export const PAYMENT_ALLOWED_TRANSITIONS: Readonly<
  Record<PaymentStatus, ReadonlySet<PaymentStatus>>
> = {
  not_configured: new Set(['awaiting_setup', 'pending', 'manual', 'paid']),
  awaiting_setup: new Set(['pending', 'not_configured', 'manual', 'paid']),
  pending: new Set(['ready_to_release', 'failed', 'manual', 'paid']),
  ready_to_release: new Set(['paid', 'failed', 'manual']),
  paid: new Set(),
  failed: new Set(['pending', 'awaiting_setup', 'manual', 'paid']),
  manual: new Set(['paid', 'pending', 'ready_to_release', 'failed']),
};

export function assertPaymentStatusTransition(from: PaymentStatus, to: PaymentStatus): void {
  const allowed = PAYMENT_ALLOWED_TRANSITIONS[from];
  if (!allowed?.has(to)) {
    throw new Error(`Invalid payment status transition: ${from} -> ${to}`);
  }
}
