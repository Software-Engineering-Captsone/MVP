/** Deal lifecycle — validated transitions in `dealTransitions.ts`. */
export const DEAL_STATUSES = [
  'created',
  'contract_pending',
  'active',
  'submission_in_progress',
  'under_review',
  'revision_requested',
  'approved_completed',
  'payment_pending',
  'paid',
  'closed',
  'cancelled',
  'disputed',
] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DELIVERABLE_STATUSES = [
  'not_started',
  'draft_submitted',
  'under_review',
  'revision_requested',
  'approved',
  'published',
  'completed',
] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export const DELIVERABLE_TYPES = [
  'instagram_post',
  'tiktok_video',
  'story',
  'appearance_event',
  'meetup',
  'keynote',
  'custom',
] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const SUBMISSION_STATUSES = [
  'submitted',
  'viewed',
  'approved',
  'revision_requested',
  'rejected',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_TYPES = ['file', 'url', 'text', 'mixed'] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export const CONTRACT_STATUSES = ['not_added', 'uploaded', 'sent_for_signature', 'signed'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'not_configured',
  'awaiting_setup',
  'pending',
  'ready_to_release',
  'paid',
  'failed',
  'manual',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Activity `eventType` values (API + storage). */
export const DEAL_ACTIVITY_EVENT_TYPES = [
  'deal_created',
  'contract_uploaded',
  'contract_signed',
  'submission_submitted',
  'revision_requested',
  'submission_approved',
  'deliverable_completed',
  'deal_completed',
  'payment_status_changed',
  'payment_pending',
  'payment_paid',
  'deal_revision_blocked',
] as const;
export type DealActivityEventType = (typeof DEAL_ACTIVITY_EVENT_TYPES)[number];

/** @deprecated legacy field name; use DealActivityEventType */
export type DealActivityType = DealActivityEventType;

export const ACTIVITY_ENTITY_TYPES = ['deal', 'deliverable', 'submission'] as const;
export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

export const ACTIVITY_ACTOR_TYPES = ['business', 'athlete', 'system'] as const;
export type ActivityActorType = (typeof ACTIVITY_ACTOR_TYPES)[number];

export type DealNextActor = 'brand' | 'athlete' | 'system';

/** Immutable terms at acceptance — do not mutate after deal creation. */
export interface DealTermsFrozenDeliverableSpec {
  title: string;
  type: DeliverableType;
  instructions: string;
  dueAt: string | null;
  draftRequired: boolean;
  publishRequired: boolean;
  proofRequired: boolean;
  disclosureRequired: boolean;
  revisionLimit: number;
}

export interface DealTermsSnapshot {
  version: 1;
  capturedAt: string;
  offerId: string;
  brandUserId: string;
  athleteUserId: string;
  offerOrigin: string;
  campaignId: string | null;
  applicationId: string | null;
  notes: string;
  structuredDraft: Record<string, unknown> | null;
  frozen: {
    deliverables: DealTermsFrozenDeliverableSpec[];
    compensationSummary: Record<string, unknown>;
    revisionLimits: { maxRoundsPerDeliverable: number; responseWindowDays?: number };
    deadlines: { offerDueDate: string | null; responseWindowDays?: number };
    instructions: string;
    contentRequirements: Record<string, unknown>;
    disclosureRequirements: Record<string, unknown>;
    platformLocationRequirements: Record<string, unknown>;
  };
}

export interface SubmissionArtifact {
  kind: 'file' | 'url' | 'text';
  /** File or link target */
  ref?: string;
  text?: string;
  label?: string;
}

export interface StoredDeal {
  _id: string;
  offerId: string;
  brandUserId: string;
  athleteUserId: string;
  campaignId?: string | null;
  applicationId?: string | null;
  chatThreadId?: string | null;
  /** Immutable copy of offer terms at acceptance; never patched from live offer. */
  termsSnapshot: DealTermsSnapshot | Record<string, unknown>;
  status: DealStatus;
  contractId: string;
  paymentId: string;
  nextActionOwner: DealNextActor | null;
  nextActionLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDeliverable {
  _id: string;
  dealId: string;
  title: string;
  /** @deprecated use instructions + type; retained for migration reads */
  description?: string;
  /** Internal ordering only; not part of public contract JSON */
  order: number;
  type: DeliverableType;
  instructions: string;
  status: DeliverableStatus;
  dueAt: string | null;
  draftRequired: boolean;
  publishRequired: boolean;
  proofRequired: boolean;
  disclosureRequired: boolean;
  revisionLimit: number;
  revisionCountUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSubmission {
  _id: string;
  deliverableId: string;
  dealId: string;
  /** Monotonic version per deliverable (1 = first submission). */
  version: number;
  submittedBy: string;
  submittedAt: string;
  submissionType: SubmissionType;
  artifacts: SubmissionArtifact[];
  notes: string;
  status: SubmissionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
  /** @deprecated migrated to `version` */
  revisionIndex?: number;
  /** @deprecated migrated to notes/artifacts */
  body?: string;
}

export interface StoredDealContract {
  _id: string;
  dealId: string;
  fileUrl: string | null;
  status: ContractStatus;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** @deprecated use fileUrl */
  fileRef?: string;
}

export interface StoredDealPayment {
  _id: string;
  dealId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerReference: string;
  releaseCondition: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** @deprecated */
  note?: string;
}

export interface StoredDealActivity {
  _id: string;
  /** Scoped deal id for repository filtering (omitted from public activity JSON). */
  dealId: string;
  entityType: ActivityEntityType;
  entityId: string;
  actorType: ActivityActorType;
  actorId: string | null;
  eventType: DealActivityEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
  /** @deprecated legacy */
  type?: DealActivityEventType;
  /** @deprecated legacy */
  actorUserId?: string | null;
  /** @deprecated legacy */
  payload?: Record<string, unknown>;
}
