import {
  type CanonicalApplicationStatus,
  type CanonicalCampaignStatus,
  canCreateOfferDraftFromApplicationStatus,
  canSendOfferFromApplicationStatus,
  isKnownApplicationStatus,
  normalizeApplicationStatus,
  normalizeCampaignStatus,
} from './status';

export class CampaignStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignStatusTransitionError';
  }
}

/** Application review states. Legacy values are normalized before transition checks. */
const APPLICATION_TRANSITIONS: Record<CanonicalApplicationStatus, Set<CanonicalApplicationStatus>> = {
  pending: new Set(['under_review', 'shortlisted', 'declined', 'withdrawn', 'offer_drafted']),
  under_review: new Set(['pending', 'shortlisted', 'declined', 'withdrawn', 'offer_drafted']),
  shortlisted: new Set(['under_review', 'declined', 'withdrawn', 'offer_drafted', 'offer_sent']),
  offer_drafted: new Set(['shortlisted', 'declined', 'withdrawn', 'offer_sent']),
  offer_sent: new Set(['offer_declined']),
  declined: new Set(),
  withdrawn: new Set(['pending']),
  offer_declined: new Set(),
};

export function isApplicationStatusTransitionAllowed(
  from: string,
  to: string
): boolean {
  if (!isKnownApplicationStatus(from) || !isKnownApplicationStatus(to)) return false;
  const normalizedFrom = normalizeApplicationStatus(from);
  const normalizedTo = normalizeApplicationStatus(to);
  if (normalizedTo === 'offer_drafted') {
    return canCreateOfferDraftFromApplicationStatus(normalizedFrom);
  }
  if (normalizedTo === 'offer_sent') {
    return canSendOfferFromApplicationStatus(normalizedFrom);
  }
  const allowed = APPLICATION_TRANSITIONS[normalizedFrom];
  if (!allowed) return false;
  return allowed.has(normalizedTo);
}

export function assertApplicationStatusTransition(
  from: string,
  to: string
): void {
  if (!isApplicationStatusTransitionAllowed(from, to)) {
    throw new ApplicationStatusTransitionError(
      `Illegal application status transition from "${from}" to "${to}"`,
      from,
      to
    );
  }
}

const CAMPAIGN_TRANSITIONS: Record<CanonicalCampaignStatus, Set<CanonicalCampaignStatus>> = {
  Draft: new Set(['Active', 'Cancelled']),
  Active: new Set(['Completed', 'Cancelled']),
  Completed: new Set(),
  Cancelled: new Set(),
};

/**
 * Guards only high-risk campaign jumps; other status changes remain allowed for product flexibility.
 */
export function validateCampaignStatusTransition(
  fromStatus: string,
  toStatus: string
): { ok: true } | { ok: false; error: string } {
  const from = normalizeCampaignStatus(fromStatus);
  const to = normalizeCampaignStatus(toStatus);
  if (from === to) return { ok: true };
  if (!CAMPAIGN_TRANSITIONS[from].has(to)) {
    return {
      ok: false,
      error: `Campaign cannot move from "${from}" to "${to}"`,
    };
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
