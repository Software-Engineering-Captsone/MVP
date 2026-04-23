import { authFetch } from '@/lib/authFetch';

export type DealNextActor = 'brand' | 'athlete' | 'system';

export type ApiDeal = {
  id: string;
  offerId: string;
  brandUserId: string;
  athleteUserId: string;
  campaignId: string | null;
  applicationId: string | null;
  chatThreadId: string | null;
  termsSnapshot: unknown;
  status: string;
  contractId: string;
  paymentId: string;
  nextActionOwner: DealNextActor | null;
  nextActionLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiDeliverable = {
  id: string;
  dealId: string;
  title: string;
  type: string;
  instructions: string;
  description?: string;
  status: string;
  dueAt: string | null;
  draftRequired: boolean;
  publishRequired: boolean;
  proofRequired: boolean;
  disclosureRequired: boolean;
  revisionLimit: number;
  revisionCountUsed: number;
};

export type SubmissionArtifact = { kind: 'file' | 'url' | 'text'; ref?: string; text?: string; label?: string };

export type ApiSubmission = {
  id: string;
  deliverableId: string;
  version: number;
  submittedBy: string;
  submittedAt: string;
  submissionType: string;
  artifacts: SubmissionArtifact[];
  notes: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  feedback: string | null;
};

export type ApiContract = {
  id: string;
  dealId: string;
  fileUrl: string | null;
  status: string;
  signedAt: string | null;
};

export type ApiPayment = {
  id: string;
  dealId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerReference: string;
  releaseCondition: string;
  paidAt: string | null;
};

export type ApiActivity = {
  id: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string | null;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ApiDealDetail = {
  deal: ApiDeal;
  contract: ApiContract | null;
  payment: ApiPayment | null;
  deliverables: ApiDeliverable[];
  activities: ApiActivity[];
};

export type BusinessDealSection = 'needs_action' | 'awaiting_athlete' | 'awaiting_review' | 'completed';

export async function readApiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (typeof j.error === 'string' && j.error.trim()) return j.error.trim();
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

export async function fetchDealsList(status?: string): Promise<ApiDeal[]> {
  const qs = status?.trim() ? `?status=${encodeURIComponent(status.trim())}` : '';
  const res = await authFetch(`/api/deals${qs}`);
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as { deals?: ApiDeal[] };
  return Array.isArray(j.deals) ? j.deals : [];
}

export async function fetchDealDetail(dealId: string): Promise<ApiDealDetail> {
  const res = await authFetch(`/api/deals/${dealId}`);
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as ApiDealDetail;
  if (!j.deal) throw new Error('Invalid deal response');
  return j;
}

export async function fetchSubmissionsForDeliverable(deliverableId: string): Promise<ApiSubmission[]> {
  const res = await authFetch(`/api/deliverables/${deliverableId}/submissions`);
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as { submissions?: ApiSubmission[] };
  return Array.isArray(j.submissions) ? j.submissions : [];
}

export async function createDeliverableSubmission(
  deliverableId: string,
  body: { notes?: string; body?: string; submissionType?: string; artifacts?: SubmissionArtifact[] }
): Promise<ApiSubmission> {
  const res = await authFetch(`/api/deliverables/${deliverableId}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as { submission?: ApiSubmission };
  if (!j.submission) throw new Error('Invalid submission response');
  return j.submission;
}

export async function patchSubmission(
  submissionId: string,
  body: { status: string; feedback?: string }
): Promise<ApiSubmission> {
  const res = await authFetch(`/api/submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as { submission?: ApiSubmission };
  if (!j.submission) throw new Error('Invalid submission response');
  return j.submission;
}

export async function patchDeliverable(
  deliverableId: string,
  body: { status?: string; title?: string; description?: string }
): Promise<ApiDeliverable> {
  const res = await authFetch(`/api/deliverables/${deliverableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as { deliverable?: ApiDeliverable };
  if (!j.deliverable) throw new Error('Invalid deliverable response');
  return j.deliverable;
}

export async function postDealContract(dealId: string, fileUrl?: string, fileRef?: string): Promise<ApiContract> {
  const res = await authFetch(`/api/deals/${dealId}/contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(fileUrl ? { fileUrl } : {}), ...(fileRef ? { fileRef } : {}) }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as { contract?: ApiContract };
  if (!j.contract) throw new Error('Invalid contract response');
  return j.contract;
}

export async function patchContractStatus(contractId: string, status: string): Promise<{ contract: ApiContract; deal?: ApiDeal }> {
  const res = await authFetch(`/api/contract/${contractId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as { contract: ApiContract; deal?: ApiDeal };
}

export async function patchPaymentStatus(
  paymentId: string,
  status: string
): Promise<{ payment: ApiPayment; deal?: ApiDeal }> {
  const res = await authFetch(`/api/payment/${paymentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as { payment: ApiPayment; deal?: ApiDeal };
}

export async function patchDealStatus(dealId: string, status: string): Promise<ApiDeal> {
  const res = await authFetch(`/api/deals/${dealId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as { deal?: ApiDeal };
  if (!j.deal) throw new Error('Invalid deal response');
  return j.deal;
}

/** List-only bucket; detail view can refine using submissions. */
export function businessSectionForDeal(deal: ApiDeal): BusinessDealSection {
  const s = deal.status;
  if (s === 'paid' || s === 'closed' || s === 'cancelled') return 'completed';
  if (deal.nextActionOwner === 'athlete') return 'awaiting_athlete';
  const label = (deal.nextActionLabel || '').toLowerCase();
  const reviewish =
    label.includes('review') ||
    label.includes('submission') ||
    label.includes('deliverable') ||
    s === 'under_review';
  if (deal.nextActionOwner === 'brand' && reviewish) return 'awaiting_review';
  if (deal.nextActionOwner === 'brand') return 'needs_action';
  if (deal.nextActionOwner === 'system') return 'needs_action';
  return 'awaiting_athlete';
}

export function formatShortId(id: string): string {
  if (!id) return '';
  const t = id.replace(/[^a-f0-9]/gi, '');
  return t.length > 8 ? `…${t.slice(-6)}` : id;
}

export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export type ParsedTerms = {
  notes: string;
  offerOrigin: string;
  compensationLine: string;
  frozenDeliverables: Array<{
    title: string;
    type: string;
    instructions: string;
    dueAt: string | null;
    revisionLimit: number;
    draftRequired: boolean;
  }>;
};

/** Sum helper for athlete dashboard stats (frozen compensation amount). */
export function compensationAmountFromDealSnapshot(termsSnapshot: unknown): number {
  if (!termsSnapshot || typeof termsSnapshot !== 'object' || Array.isArray(termsSnapshot)) return 0;
  const frozen = (termsSnapshot as Record<string, unknown>).frozen;
  if (!frozen || typeof frozen !== 'object') return 0;
  const comp = (frozen as Record<string, unknown>).compensationSummary;
  if (!comp || typeof comp !== 'object') return 0;
  const a = (comp as Record<string, unknown>).amount;
  return typeof a === 'number' && Number.isFinite(a) ? a : 0;
}

export function parseTermsSnapshot(raw: unknown): ParsedTerms | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const ts = raw as Record<string, unknown>;
  const notes = typeof ts.notes === 'string' ? ts.notes : '';
  const offerOrigin = typeof ts.offerOrigin === 'string' ? ts.offerOrigin : '';
  const frozen = ts.frozen && typeof ts.frozen === 'object' && !Array.isArray(ts.frozen) ? (ts.frozen as Record<string, unknown>) : {};
  const comp = frozen.compensationSummary && typeof frozen.compensationSummary === 'object' ? (frozen.compensationSummary as Record<string, unknown>) : {};
  const amountLabel = typeof comp.amountLabel === 'string' && comp.amountLabel ? comp.amountLabel : null;
  const amount = typeof comp.amount === 'number' ? comp.amount : null;
  const currency = typeof comp.currency === 'string' ? comp.currency : 'USD';
  const compensationLine =
    amountLabel || (amount != null ? `${currency} ${amount.toLocaleString()}` : 'Compensation per agreed offer');

  const dels = Array.isArray(frozen.deliverables) ? frozen.deliverables : [];
  const frozenDeliverables = dels
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object' && !Array.isArray(d))
    .map((d) => ({
      title: typeof d.title === 'string' ? d.title : 'Deliverable',
      type: typeof d.type === 'string' ? d.type : 'custom',
      instructions: typeof d.instructions === 'string' ? d.instructions : '',
      dueAt: typeof d.dueAt === 'string' ? d.dueAt : null,
      revisionLimit: typeof d.revisionLimit === 'number' ? d.revisionLimit : 0,
      draftRequired: Boolean(d.draftRequired),
    }));

  return { notes, offerOrigin, compensationLine, frozenDeliverables };
}

export function humanizeDealStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export function activitySummary(a: ApiActivity): string {
  switch (a.eventType) {
    case 'deal_created':
      return 'Deal created';
    case 'contract_uploaded':
      return 'Contract uploaded';
    case 'contract_signed':
      return 'Contract signed';
    case 'submission_submitted':
      return 'Submission received';
    case 'revision_requested':
      return 'Revision requested';
    case 'submission_approved':
      return 'Submission approved';
    case 'deliverable_completed':
      return 'Deliverable completed';
    case 'deal_completed':
      return 'Deal marked complete';
    case 'payment_status_changed':
    case 'payment_pending':
    case 'payment_paid':
      return 'Payment update';
    default:
      return a.eventType.replace(/_/g, ' ');
  }
}
