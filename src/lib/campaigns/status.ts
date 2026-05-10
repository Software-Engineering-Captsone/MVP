export const CAMPAIGN_STATUSES = ['Draft', 'Active', 'Completed', 'Cancelled'] as const;

export type CanonicalCampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const APPLICATION_STATUSES = [
  'pending',
  'under_review',
  'shortlisted',
  'offer_drafted',
  'offer_sent',
  'declined',
  'withdrawn',
  'offer_declined',
] as const;

export type CanonicalApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const APPLICATION_STATUS_INPUTS = new Set<string>([
  ...APPLICATION_STATUSES,
  'applied',
  'approved',
  'rejected',
]);

export const APPLICATION_STATUS_LABELS: Record<CanonicalApplicationStatus, string> = {
  pending: 'Applied',
  under_review: 'In Review',
  shortlisted: 'Shortlisted',
  offer_drafted: 'Offer Drafted',
  offer_sent: 'Offer Sent',
  declined: 'Rejected',
  withdrawn: 'Withdrawn',
  offer_declined: 'Offer Declined',
};

export const APPLICATION_STATUS_DESCRIPTIONS: Record<CanonicalApplicationStatus, string> = {
  pending: 'Application received',
  under_review: 'Brand is reviewing the application',
  shortlisted: 'Shortlisted for an offer',
  offer_drafted: 'Offer draft is ready',
  offer_sent: 'Offer sent to the athlete',
  declined: 'Application was rejected',
  withdrawn: 'Application was withdrawn',
  offer_declined: 'Offer was declined',
};

const LEGACY_ACTIVE_CAMPAIGN_STATUSES = new Set([
  'Open for Applications',
  'Reviewing Candidates',
  'Deal Creation in Progress',
]);

const LEGACY_DRAFT_CAMPAIGN_STATUSES = new Set(['Ready to Launch']);

export function normalizeCampaignStatus(status: unknown): CanonicalCampaignStatus {
  if (typeof status !== 'string') return 'Draft';
  if (status === 'Completed' || status === 'Cancelled' || status === 'Active' || status === 'Draft') {
    return status;
  }
  if (LEGACY_ACTIVE_CAMPAIGN_STATUSES.has(status)) return 'Active';
  if (LEGACY_DRAFT_CAMPAIGN_STATUSES.has(status)) return 'Draft';
  return 'Draft';
}

export function isCampaignOpenForApplications(status: unknown): boolean {
  return normalizeCampaignStatus(status) === 'Active';
}

export function normalizeApplicationStatus(status: unknown): CanonicalApplicationStatus {
  if (typeof status !== 'string') return 'pending';

  switch (status) {
    case 'applied':
      return 'pending';
    case 'approved':
      return 'offer_drafted';
    case 'rejected':
      return 'declined';
    case 'pending':
    case 'under_review':
    case 'shortlisted':
    case 'offer_drafted':
    case 'offer_sent':
    case 'declined':
    case 'withdrawn':
    case 'offer_declined':
      return status;
    default:
      return 'pending';
  }
}

export function applicationStatusLabel(status: unknown): string {
  return APPLICATION_STATUS_LABELS[normalizeApplicationStatus(status)];
}

export function applicationStatusDescription(status: unknown): string {
  return APPLICATION_STATUS_DESCRIPTIONS[normalizeApplicationStatus(status)];
}

export function normalizeInboundApplicationStatus(status: unknown): CanonicalApplicationStatus | null {
  if (typeof status !== 'string') return null;
  if (!APPLICATION_STATUS_INPUTS.has(status)) return null;
  if (status === 'approved') return 'offer_drafted';
  if (status === 'rejected') return 'declined';

  const normalized = normalizeApplicationStatus(status);
  return APPLICATION_STATUSES.includes(normalized) ? normalized : null;
}

export function isKnownApplicationStatus(status: unknown): boolean {
  return typeof status === 'string' && APPLICATION_STATUS_INPUTS.has(status);
}

export function canCreateOfferDraftFromApplicationStatus(status: unknown): boolean {
  return ['pending', 'under_review', 'shortlisted', 'offer_drafted'].includes(
    normalizeApplicationStatus(status),
  );
}

export function canSendOfferFromApplicationStatus(status: unknown): boolean {
  return ['shortlisted', 'offer_drafted'].includes(normalizeApplicationStatus(status));
}

export function isClosedApplicationStatus(status: unknown): boolean {
  return ['declined', 'withdrawn', 'offer_declined'].includes(normalizeApplicationStatus(status));
}
