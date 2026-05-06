import { authFetch } from '@/lib/authFetch';

export type DealNextActor = 'brand' | 'athlete' | 'system';

export type ApiDeal = {
  id: string;
  offerId: string;
  brandUserId: string;
  athleteUserId: string;
  athleteName?: string;
  athleteAvatarUrl?: string;
  athleteSport?: string;
  athleteSchool?: string;
  campaignName?: string | null;
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

const mockNow = new Date();
const daysAgo = (n: number) => new Date(mockNow.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const daysFromNow = (n: number) => new Date(mockNow.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const MOCK_ATHLETE_DEALS: ApiDeal[] = [
  {
    id: 'mock-deal-1',
    offerId: 'mock-offer-1',
    brandUserId: 'powerfuel-energy',
    athleteUserId: 'mock-athlete',
    campaignId: null,
    applicationId: 'mock-app-1',
    chatThreadId: null,
    termsSnapshot: {
      notes: 'Deliverables align with spring training block.',
      frozen: {
        compensationSummary: { amount: 2500, amountLabel: '$2,500 total', currency: 'USD' },
        deliverables: [{ title: 'IG Reel + Story Set', type: 'reel', instructions: 'Energy routine content', dueAt: daysFromNow(5), revisionLimit: 1, draftRequired: true }],
      },
    },
    status: 'active',
    contractId: 'mock-contract-1',
    paymentId: 'mock-payment-1',
    nextActionOwner: 'brand',
    nextActionLabel: 'Brand reviewing submitted content',
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
  },
  {
    id: 'mock-deal-2',
    offerId: 'mock-offer-2',
    brandUserId: 'campus-threads',
    athleteUserId: 'mock-athlete',
    campaignId: null,
    applicationId: 'mock-app-2',
    chatThreadId: null,
    termsSnapshot: {
      notes: '2 lookbook posts and one giveaway mention.',
      frozen: {
        compensationSummary: { amount: 1800, amountLabel: '$1,800 + apparel kit', currency: 'USD' },
        deliverables: [{ title: 'Lookbook Post', type: 'image', instructions: 'Spring collection feature', dueAt: daysFromNow(10), revisionLimit: 2, draftRequired: true }],
      },
    },
    status: 'under_review',
    contractId: 'mock-contract-2',
    paymentId: 'mock-payment-2',
    nextActionOwner: 'brand',
    nextActionLabel: 'Awaiting revision notes from brand',
    createdAt: daysAgo(14),
    updatedAt: daysAgo(2),
  },
  {
    id: 'mock-deal-3',
    offerId: 'mock-offer-3',
    brandUserId: 'techgear-pro',
    athleteUserId: 'mock-athlete',
    campaignId: null,
    applicationId: 'mock-app-3',
    chatThreadId: null,
    termsSnapshot: {
      notes: 'Completed event appearance recap and tag requirements.',
      frozen: {
        compensationSummary: { amount: 3200, amountLabel: '$3,200 total', currency: 'USD' },
        deliverables: [{ title: 'Launch Event Appearance', type: 'event', instructions: 'In-person appearance + recap post', dueAt: daysAgo(7), revisionLimit: 0, draftRequired: false }],
      },
    },
    status: 'paid',
    contractId: 'mock-contract-3',
    paymentId: 'mock-payment-3',
    nextActionOwner: 'system',
    nextActionLabel: 'Deal completed',
    createdAt: daysAgo(24),
    updatedAt: daysAgo(4),
  },
];

const MOCK_DEAL_DETAILS: Record<string, ApiDealDetail> = {
  'mock-deal-1': {
    deal: MOCK_ATHLETE_DEALS[0],
    contract: { id: 'mock-contract-1', dealId: 'mock-deal-1', fileUrl: null, status: 'signed', signedAt: daysAgo(7) },
    payment: { id: 'mock-payment-1', dealId: 'mock-deal-1', amount: 2500, currency: 'USD', status: 'pending', provider: 'manual', providerReference: 'mock-ref-1', releaseCondition: 'deliverable_approved', paidAt: null },
    deliverables: [
      {
        id: 'mock-deliverable-1',
        dealId: 'mock-deal-1',
        title: 'IG Reel + Story Set',
        type: 'reel',
        instructions: 'Post one training reel and two stories with brand tag + #ad.',
        status: 'submitted',
        dueAt: daysFromNow(5),
        draftRequired: true,
        publishRequired: true,
        proofRequired: true,
        disclosureRequired: true,
        revisionLimit: 1,
        revisionCountUsed: 0,
      },
    ],
    activities: [{ id: 'mock-act-1', entityType: 'deal', entityId: 'mock-deal-1', actorType: 'athlete', actorId: 'mock-athlete', eventType: 'submission_submitted', metadata: {}, createdAt: daysAgo(1) }],
  },
  'mock-deal-2': {
    deal: MOCK_ATHLETE_DEALS[1],
    contract: { id: 'mock-contract-2', dealId: 'mock-deal-2', fileUrl: null, status: 'signed', signedAt: daysAgo(12) },
    payment: { id: 'mock-payment-2', dealId: 'mock-deal-2', amount: 1800, currency: 'USD', status: 'pending', provider: 'manual', providerReference: 'mock-ref-2', releaseCondition: 'deal_completed', paidAt: null },
    deliverables: [
      {
        id: 'mock-deliverable-2',
        dealId: 'mock-deal-2',
        title: 'Lookbook Post',
        type: 'image',
        instructions: 'One static feed post in full outfit with product tag.',
        status: 'submitted',
        dueAt: daysFromNow(10),
        draftRequired: true,
        publishRequired: true,
        proofRequired: true,
        disclosureRequired: true,
        revisionLimit: 2,
        revisionCountUsed: 1,
      },
    ],
    activities: [{ id: 'mock-act-2', entityType: 'submission', entityId: 'mock-deliverable-2', actorType: 'brand', actorId: 'mock-brand', eventType: 'revision_requested', metadata: {}, createdAt: daysAgo(2) }],
  },
  'mock-deal-3': {
    deal: MOCK_ATHLETE_DEALS[2],
    contract: { id: 'mock-contract-3', dealId: 'mock-deal-3', fileUrl: null, status: 'signed', signedAt: daysAgo(22) },
    payment: { id: 'mock-payment-3', dealId: 'mock-deal-3', amount: 3200, currency: 'USD', status: 'paid', provider: 'manual', providerReference: 'mock-ref-3', releaseCondition: 'deal_completed', paidAt: daysAgo(4) },
    deliverables: [
      {
        id: 'mock-deliverable-3',
        dealId: 'mock-deal-3',
        title: 'Launch Event Appearance',
        type: 'event',
        instructions: 'Attend launch event and publish same-day recap.',
        status: 'completed',
        dueAt: daysAgo(7),
        draftRequired: false,
        publishRequired: true,
        proofRequired: true,
        disclosureRequired: true,
        revisionLimit: 0,
        revisionCountUsed: 0,
      },
    ],
    activities: [{ id: 'mock-act-3', entityType: 'payment', entityId: 'mock-payment-3', actorType: 'system', actorId: null, eventType: 'payment_paid', metadata: {}, createdAt: daysAgo(4) }],
  },
};

const MOCK_SUBMISSIONS_BY_DELIVERABLE: Record<string, ApiSubmission[]> = {
  'mock-deliverable-1': [
    {
      id: 'mock-sub-1',
      deliverableId: 'mock-deliverable-1',
      version: 1,
      submittedBy: 'mock-athlete',
      submittedAt: daysAgo(1),
      submissionType: 'content',
      artifacts: [{ kind: 'url', ref: 'https://instagram.com/p/mock-reel-1', label: 'Draft Reel' }],
      notes: '[Draft] First cut submitted for review',
      status: 'submitted',
      reviewedBy: null,
      reviewedAt: null,
      feedback: null,
    },
  ],
  'mock-deliverable-2': [
    {
      id: 'mock-sub-2',
      deliverableId: 'mock-deliverable-2',
      version: 1,
      submittedBy: 'mock-athlete',
      submittedAt: daysAgo(3),
      submissionType: 'content',
      artifacts: [{ kind: 'url', ref: 'https://instagram.com/p/mock-lookbook-1', label: 'Lookbook Post' }],
      notes: '[Final] Submitted for final review',
      status: 'revision_requested',
      reviewedBy: 'mock-brand',
      reviewedAt: daysAgo(2),
      feedback: 'Please add product close-up in first frame.',
    },
  ],
  'mock-deliverable-3': [
    {
      id: 'mock-sub-3',
      deliverableId: 'mock-deliverable-3',
      version: 1,
      submittedBy: 'mock-athlete',
      submittedAt: daysAgo(8),
      submissionType: 'content',
      artifacts: [{ kind: 'url', ref: 'https://instagram.com/p/mock-event-1', label: 'Event Recap' }],
      notes: '[Final] Event recap completed',
      status: 'approved',
      reviewedBy: 'mock-brand',
      reviewedAt: daysAgo(7),
      feedback: null,
    },
  ],
};

export type BusinessDealSection = 'needs_action' | 'awaiting_athlete' | 'awaiting_review' | 'completed';

/**
 * When `NEXT_PUBLIC_DEALS_USE_MOCKS=1`, empty lists / failed loads can show bundled
 * demo deals for screenshots. Production should omit this variable.
 */
export function dealsUseMocks(): boolean {
  return process.env.NEXT_PUBLIC_DEALS_USE_MOCKS === '1';
}

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

export function getMockAthleteDeals(): ApiDeal[] {
  return MOCK_ATHLETE_DEALS;
}

export function getMockAthleteDealDetail(dealId: string): ApiDealDetail | null {
  return MOCK_DEAL_DETAILS[dealId] ?? null;
}

export function getMockAthleteSubmissions(deliverableId: string): ApiSubmission[] {
  return MOCK_SUBMISSIONS_BY_DELIVERABLE[deliverableId] ?? [];
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

export async function requestDealContractUploadUrl(
  dealId: string,
  opts: { filename: string; contentType?: string },
): Promise<{ path: string; signedUrl: string; token: string }> {
  const res = await authFetch(`/api/deals/${dealId}/contract/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const j = (await res.json()) as { path?: string; signedUrl?: string; token?: string };
  if (!j.path || !j.signedUrl) throw new Error('Invalid upload URL response');
  return { path: j.path, signedUrl: j.signedUrl, token: j.token ?? '' };
}

/** PUT file bytes to the signed URL returned by `requestDealContractUploadUrl`. */
export async function putFileToContractSignedUploadUrl(signedUrl: string, file: File): Promise<void> {
  const ct = file.type || 'application/octet-stream';
  const put = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': ct },
  });
  if (!put.ok) throw new Error(put.statusText || 'Upload failed');
}

/** Full flow: signed upload URL → PUT file → persist storage path on the contract row. */
export async function uploadDealContractFromFile(dealId: string, file: File): Promise<ApiContract> {
  const { signedUrl, path } = await requestDealContractUploadUrl(dealId, {
    filename: file.name || 'contract.pdf',
    contentType: file.type || undefined,
  });
  await putFileToContractSignedUploadUrl(signedUrl, file);
  return postDealContract(dealId, undefined, undefined, path);
}

export async function postDealContract(
  dealId: string,
  fileUrl?: string,
  fileRef?: string,
  storagePath?: string,
): Promise<ApiContract> {
  const res = await authFetch(`/api/deals/${dealId}/contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(fileUrl ? { fileUrl } : {}),
      ...(fileRef ? { fileRef } : {}),
      ...(storagePath ? { storagePath } : {}),
    }),
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
