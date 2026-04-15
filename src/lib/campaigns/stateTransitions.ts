export class CampaignStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignStatusTransitionError';
  }
}

/** Application review states (brand-controlled after submit). */
const APPLICATION_TRANSITIONS: Record<
  string,
  Set<'under_review' | 'shortlisted' | 'rejected' | 'offer_sent' | 'offer_declined'>
> = {
  // New lifecycle
  applied: new Set(['under_review', 'shortlisted', 'rejected']),
  under_review: new Set(['shortlisted', 'rejected']),
  shortlisted: new Set(['under_review', 'rejected', 'offer_sent']),
  rejected: new Set(),
  offer_sent: new Set(['offer_declined']),
  offer_declined: new Set(),
  // Legacy lifecycle aliases
  pending: new Set(['shortlisted', 'approved', 'declined']),
  approved: new Set(['declined']),
  declined: new Set(),
};

export function isApplicationStatusTransitionAllowed(
  from: string,
  to: 'under_review' | 'shortlisted' | 'rejected' | 'offer_sent' | 'offer_declined'
): boolean {
  const allowed = APPLICATION_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
}

export function assertApplicationStatusTransition(
  from: string,
  to: 'under_review' | 'shortlisted' | 'rejected' | 'offer_sent' | 'offer_declined'
): void {
  if (!isApplicationStatusTransitionAllowed(from, to)) {
    throw new ApplicationStatusTransitionError(
      `Illegal application status transition from "${from}" to "${to}"`,
      from,
      to
    );
  }
}

const DEAL_CREATION_SOURCES = new Set([
  'Open for Applications',
  'Reviewing Candidates',
  'Deal Creation in Progress',
]);

/**
 * Guards only high-risk campaign jumps; other status changes remain allowed for product flexibility.
 */
export function validateCampaignStatusTransition(
  fromStatus: string,
  toStatus: string
): { ok: true } | { ok: false; error: string } {
  if (fromStatus === toStatus) return { ok: true };
  if (toStatus === 'Deal Creation in Progress' && !DEAL_CREATION_SOURCES.has(fromStatus)) {
    return {
      ok: false,
      error: `Campaign cannot move to Deal Creation in Progress from status "${fromStatus}"`,
    };
  }
  if (toStatus === 'Active' && fromStatus === 'Draft') {
    return { ok: false, error: 'Campaign cannot become Active directly from Draft' };
  }
  return { ok: true };
}

export function assertCampaignStatusTransition(fromStatus: string, toStatus: string): void {
  const r = validateCampaignStatusTransition(fromStatus, toStatus);
  if (!r.ok) throw new CampaignStatusTransitionError(r.error);
}

export class ApplicationStatusTransitionError extends Error {
  constructor(
    message: string,
    readonly from: string,
    readonly to: string
  ) {
    super(message);
    this.name = 'ApplicationStatusTransitionError';
  }
}
