import type {
  StoredApplication,
  StoredCampaign,
  StoredDeal,
  StoredDealActivity,
  StoredDealContract,
  StoredDealPayment,
  StoredDeliverable,
  StoredOffer,
  StoredSubmission,
} from './localCampaignStore';
import { campaignBriefV2ToLegacy, resolveCampaignBriefV2ForApi } from './campaignBriefV2Mapper';

function idOf(row: { _id?: unknown }): string {
  return row._id != null ? String(row._id) : '';
}

/** API shape for list + detail (shared fields). */
export function campaignToJSON(c: StoredCampaign) {
  const campaignBriefV2 = resolveCampaignBriefV2ForApi(c as Record<string, unknown>) ?? undefined;
  const derived = campaignBriefV2 ? campaignBriefV2ToLegacy(campaignBriefV2) : {};
  return {
    id: idOf(c),
    brandUserId: c.brandUserId,
    brandDisplayName: c.brandDisplayName ?? '',
    name: (derived.name as string) ?? c.name,
    campaignType: c.campaignType ?? '',
    opportunityContext: (derived.opportunityContext as string) ?? c.opportunityContext ?? '',
    subtitle: c.subtitle ?? '',
    packageName: c.packageName ?? '',
    packageId: c.packageId ?? '',
    goal: (derived.goal as string) ?? c.goal ?? '',
    brief: (derived.brief as string) ?? c.brief ?? '',
    budget: (derived.budget as string) ?? c.budget ?? '',
    budgetHint: (derived.budgetHint as string) ?? c.budgetHint ?? c.budget ?? '',
    duration: c.duration ?? '',
    location: (derived.location as string) ?? c.location ?? '',
    startDate: (derived.startDate as string) ?? c.startDate ?? '',
    endDate: (derived.endDate as string) ?? c.endDate ?? '',
    visibility: (derived.visibility as string) ?? c.visibility,
    acceptApplications:
      typeof derived.acceptApplications === 'boolean'
        ? derived.acceptApplications
        : c.acceptApplications,
    sport: (derived.sport as string) ?? c.sport ?? '',
    genderFilter: (derived.genderFilter as string) ?? c.genderFilter ?? '',
    followerMin:
      typeof derived.followerMin === 'number'
        ? derived.followerMin
        : c.followerMin ?? 0,
    engagementMinPct:
      typeof derived.engagementMinPct === 'number'
        ? derived.engagementMinPct
        : typeof c.engagementMinPct === 'number'
          ? c.engagementMinPct
          : Number(c.engagementMinPct) || 0,
    brandFitTags: Array.isArray(derived.brandFitTags)
      ? (derived.brandFitTags as string[])
      : Array.isArray(c.brandFitTags)
        ? (c.brandFitTags as string[])
        : [],
    packageDetails: Array.isArray(derived.packageDetails)
      ? (derived.packageDetails as string[])
      : c.packageDetails ?? [],
    platforms: Array.isArray(derived.platforms)
      ? (derived.platforms as string[])
      : c.platforms ?? [],
    image: c.image ?? '',
    workflowPresetSource: (c.workflowPresetSource as 'template' | 'scratch' | undefined) ?? undefined,
    workflowPublishReviewConfirmed: Boolean(c.workflowPublishReviewConfirmed),
    status: c.status,
    workflow: {
      stage: 'campaign',
      next: 'applications',
    },
    funnel: [
      'campaign',
      'applications',
      'business_review_and_selection',
      'offer_creation',
      'athlete_acceptance',
    ],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    campaignBriefV2,
  };
}

export function offerToJSON(o: StoredOffer, campaigns?: StoredCampaign[]) {
  const campaignId =
    o.campaignId != null && String(o.campaignId) !== '' ? String(o.campaignId) : null;
  const applicationId =
    o.applicationId != null && String(o.applicationId) !== ''
      ? String(o.applicationId)
      : null;
  let brandUserId = o.brandUserId != null ? String(o.brandUserId) : '';
  if (!brandUserId && campaignId && Array.isArray(campaigns)) {
    const c = campaigns.find((row) => idOf(row) === campaignId);
    if (c?.brandUserId) brandUserId = String(c.brandUserId);
  }
  const structuredDraft =
    o.structuredDraft != null && typeof o.structuredDraft === 'object' && !Array.isArray(o.structuredDraft)
      ? (o.structuredDraft as Record<string, unknown>)
      : undefined;
  const originContext =
    structuredDraft && typeof structuredDraft.originContext === 'object' && !Array.isArray(structuredDraft.originContext)
      ? (structuredDraft.originContext as Record<string, unknown>)
      : undefined;
  const ocOrigin =
    typeof originContext?.offerOrigin === 'string' && originContext.offerOrigin
      ? originContext.offerOrigin
      : '';
  let offerOrigin =
    typeof o.offerOrigin === 'string' && o.offerOrigin ? o.offerOrigin : '';
  if (!offerOrigin) {
    if (ocOrigin === 'chat_negotiated') {
      offerOrigin = 'chat_negotiated';
    } else if (campaignId && applicationId) {
      offerOrigin = 'campaign_handoff';
    } else {
      offerOrigin = 'direct_profile';
    }
  }
  return {
    id: idOf(o),
    brandUserId,
    offerOrigin,
    campaignId,
    applicationId,
    athleteUserId: o.athleteUserId,
    status: o.status ?? 'draft',
    ...(o.dealId != null && String(o.dealId).trim() !== '' ? { dealId: String(o.dealId) } : {}),
    notes: typeof o.notes === 'string' ? o.notes : '',
    ...(o.sentAt != null ? { sentAt: o.sentAt } : {}),
    ...(o.acceptedAt != null ? { acceptedAt: o.acceptedAt } : {}),
    ...(o.declinedAt != null ? { declinedAt: o.declinedAt } : {}),
    ...(typeof o.declineReason === 'string' && o.declineReason.trim()
      ? { declineReason: o.declineReason.trim() }
      : {}),
    ...(typeof o.declineNote === 'string' && o.declineNote.trim()
      ? { declineNote: o.declineNote.trim() }
      : {}),
    ...(structuredDraft ? { structuredDraft } : {}),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function referralMetaToJSON(meta: unknown): Record<string, unknown> | undefined {
  if (meta == null || typeof meta !== 'object' || Array.isArray(meta)) return undefined;
  const r = meta as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (r.inviterUserId != null) out.inviterUserId = String(r.inviterUserId);
  if (r.origin === 'profile' || r.origin === 'chat' || r.origin === 'manual') {
    out.origin = r.origin;
  }
  if (r.timestamp instanceof Date) {
    out.timestamp = r.timestamp.toISOString();
  } else if (typeof r.timestamp === 'string' && r.timestamp) {
    out.timestamp = r.timestamp;
  }
  if (typeof r.note === 'string' && r.note) out.note = r.note;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function applicationToJSON(a: StoredApplication) {
  const source = a.source === 'referral' ? 'referral' : 'regular';
  const referralMeta = referralMetaToJSON(a.referralMeta);
  return {
    id: idOf(a),
    campaignId: a.campaignId,
    athleteUserId: a.athleteUserId,
    source,
    ...(referralMeta ? { referralMeta } : {}),
    status: a.status,
    ...(a.withdrawnByAthlete === true ? { withdrawnByAthlete: true } : {}),
    ...(a.withdrawnAt ? { withdrawnAt: a.withdrawnAt } : {}),
    pitch: a.pitch ?? '',
    athleteSnapshot: a.athleteSnapshot ?? {},
    messages: (Array.isArray(a.messages) ? a.messages : []).map((m: Record<string, unknown>) => ({
      id: m._id != null ? String(m._id) : '',
      fromUserId: m.fromUserId,
      body: m.body,
      createdAt: m.createdAt,
    })),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function athletePublicCampaignJSON(c: StoredCampaign) {
  const full = campaignToJSON(c);
  const { brandUserId: _brandUserId, ...rest } = full;
  void _brandUserId;
  return rest;
}

export function dealToJSON(d: StoredDeal) {
  return {
    id: idOf(d),
    offerId: d.offerId,
    brandUserId: d.brandUserId,
    athleteUserId: d.athleteUserId,
    campaignId: d.campaignId ?? null,
    applicationId: d.applicationId ?? null,
    chatThreadId: d.chatThreadId ?? null,
    termsSnapshot: d.termsSnapshot,
    status: d.status,
    contractId: d.contractId,
    paymentId: d.paymentId,
    nextActionOwner: d.nextActionOwner,
    nextActionLabel: d.nextActionLabel,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function deliverableToJSON(d: StoredDeliverable) {
  const instructions = d.instructions ?? d.description ?? '';
  return {
    id: idOf(d),
    dealId: d.dealId,
    title: d.title,
    type: d.type,
    instructions,
    /** @deprecated same as instructions; kept for older dashboard reads */
    description: instructions,
    status: d.status,
    dueAt: d.dueAt ?? null,
    draftRequired: Boolean(d.draftRequired),
    publishRequired: Boolean(d.publishRequired),
    proofRequired: Boolean(d.proofRequired),
    disclosureRequired: Boolean(d.disclosureRequired),
    revisionLimit: typeof d.revisionLimit === 'number' ? d.revisionLimit : 0,
    revisionCountUsed: typeof d.revisionCountUsed === 'number' ? d.revisionCountUsed : 0,
  };
}

export function submissionToJSON(s: StoredSubmission) {
  return {
    id: idOf(s),
    deliverableId: s.deliverableId,
    version: typeof s.version === 'number' ? s.version : (s.revisionIndex ?? 0) + 1,
    submittedBy: s.submittedBy ?? '',
    submittedAt: s.submittedAt ?? s.createdAt,
    submissionType: s.submissionType ?? 'text',
    artifacts: Array.isArray(s.artifacts) ? s.artifacts : [],
    notes: s.notes ?? (typeof s.body === 'string' ? s.body : ''),
    status: s.status,
    reviewedBy: s.reviewedBy ?? null,
    reviewedAt: s.reviewedAt ?? null,
    feedback: s.feedback ?? null,
  };
}

export function dealContractToJSON(c: StoredDealContract) {
  const fileUrl =
    typeof c.fileUrl === 'string' && c.fileUrl
      ? c.fileUrl
      : typeof c.fileRef === 'string' && c.fileRef
        ? c.fileRef
        : null;
  return {
    id: idOf(c),
    dealId: c.dealId,
    fileUrl,
    status: c.status,
    signedAt: c.signedAt ?? null,
  };
}

export function dealPaymentToJSON(p: StoredDealPayment) {
  return {
    id: idOf(p),
    dealId: p.dealId,
    amount: typeof p.amount === 'number' ? p.amount : 0,
    currency: typeof p.currency === 'string' && p.currency ? p.currency : 'USD',
    status: p.status,
    provider: typeof p.provider === 'string' && p.provider ? p.provider : 'placeholder',
    providerReference: typeof p.providerReference === 'string' ? p.providerReference : '',
    releaseCondition: typeof p.releaseCondition === 'string' ? p.releaseCondition : 'deal_completion',
    paidAt: p.paidAt ?? null,
  };
}

export function dealActivityToJSON(a: StoredDealActivity) {
  const eventType = a.eventType ?? a.type ?? 'deal_created';
  const metadata =
    a.metadata && typeof a.metadata === 'object'
      ? a.metadata
      : a.payload && typeof a.payload === 'object'
        ? { ...a.payload }
        : {};
  const actorType =
    a.actorType ??
    (a.actorUserId
      ? 'business'
      : 'system');
  const actorId = a.actorId ?? a.actorUserId ?? null;
  const entityType = a.entityType ?? 'deal';
  const entityId = a.entityId ?? a.dealId;
  return {
    id: idOf(a),
    entityType,
    entityId,
    actorType,
    actorId,
    eventType,
    metadata,
    createdAt: a.createdAt,
  };
}
