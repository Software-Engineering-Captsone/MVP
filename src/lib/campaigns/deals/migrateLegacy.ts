import type {
  ActivityActorType,
  ActivityEntityType,
  DealActivityEventType,
  DealTermsFrozenDeliverableSpec,
  DeliverableType,
  StoredDeal,
  StoredDealActivity,
  StoredDealContract,
  StoredDealPayment,
  StoredDeliverable,
  StoredSubmission,
  SubmissionArtifact,
  SubmissionStatus,
  SubmissionType,
} from './types';

const DELIVERABLE_TYPES_SET = new Set<string>([
  'instagram_post',
  'tiktok_video',
  'story',
  'appearance_event',
  'meetup',
  'keynote',
  'custom',
]);

function coerceDeliverableType(raw: unknown): DeliverableType {
  const s = typeof raw === 'string' ? raw : '';
  return DELIVERABLE_TYPES_SET.has(s) ? (s as DeliverableType) : 'custom';
}

function coerceSubmissionType(raw: unknown): SubmissionType {
  const s = typeof raw === 'string' ? raw : '';
  if (s === 'file' || s === 'url' || s === 'text' || s === 'mixed') return s;
  return 'text';
}

function inferActorType(userId: string | null | undefined, deal: StoredDeal): ActivityActorType {
  if (!userId) return 'system';
  if (userId === deal.brandUserId) return 'business';
  if (userId === deal.athleteUserId) return 'athlete';
  return 'system';
}

function entityFromLegacyEvent(
  eventType: DealActivityEventType,
  dealId: string,
  metadata: Record<string, unknown>
): { entityType: ActivityEntityType; entityId: string } {
  const submissionId = typeof metadata.submissionId === 'string' ? metadata.submissionId : '';
  const deliverableId = typeof metadata.deliverableId === 'string' ? metadata.deliverableId : '';
  if (
    eventType === 'submission_submitted' ||
    eventType === 'revision_requested' ||
    eventType === 'submission_approved'
  ) {
    if (submissionId) return { entityType: 'submission', entityId: submissionId };
  }
  if (eventType === 'deliverable_completed') {
    return { entityType: 'deliverable', entityId: deliverableId || dealId };
  }
  return { entityType: 'deal', entityId: dealId };
}

/** Normalize a deliverable row from local store (legacy → contract shape). */
export function normalizeStoredDeliverable(d: StoredDeliverable): StoredDeliverable {
  const description = typeof d.description === 'string' ? d.description : '';
  const instructions = typeof d.instructions === 'string' ? d.instructions : description;
  return {
    ...d,
    type: 'type' in d && d.type != null ? coerceDeliverableType(d.type) : 'custom',
    instructions,
    dueAt: d.dueAt != null ? String(d.dueAt) : null,
    draftRequired: typeof d.draftRequired === 'boolean' ? d.draftRequired : true,
    publishRequired: typeof d.publishRequired === 'boolean' ? d.publishRequired : false,
    proofRequired: typeof d.proofRequired === 'boolean' ? d.proofRequired : false,
    disclosureRequired: typeof d.disclosureRequired === 'boolean' ? d.disclosureRequired : false,
    revisionLimit: typeof d.revisionLimit === 'number' && Number.isFinite(d.revisionLimit) ? Math.max(0, d.revisionLimit) : 2,
    revisionCountUsed:
      typeof d.revisionCountUsed === 'number' && Number.isFinite(d.revisionCountUsed) ? Math.max(0, d.revisionCountUsed) : 0,
    order: typeof d.order === 'number' ? d.order : 0,
  };
}

export function normalizeStoredSubmission(s: StoredSubmission): StoredSubmission {
  const legacyBody = typeof s.body === 'string' ? s.body : '';
  const notes = typeof s.notes === 'string' ? s.notes : legacyBody;
  let artifacts: SubmissionArtifact[] = Array.isArray(s.artifacts) ? s.artifacts : [];
  if (!artifacts.length && legacyBody) {
    artifacts = [{ kind: 'text', text: legacyBody }];
  }
  const version =
    typeof s.version === 'number' && Number.isFinite(s.version)
      ? Math.max(1, s.version)
      : typeof s.revisionIndex === 'number'
        ? Math.max(1, s.revisionIndex + 1)
        : 1;
  return {
    ...s,
    version,
    submittedBy: typeof s.submittedBy === 'string' && s.submittedBy ? s.submittedBy : '',
    submittedAt: typeof s.submittedAt === 'string' && s.submittedAt ? s.submittedAt : s.createdAt,
    submissionType: coerceSubmissionType(s.submissionType),
    artifacts,
    notes,
    status: (s.status as SubmissionStatus) ?? 'submitted',
    reviewedBy: s.reviewedBy ?? null,
    reviewedAt: s.reviewedAt ?? null,
    feedback: s.feedback ?? null,
  };
}

export function normalizeStoredContract(c: StoredDealContract): StoredDealContract {
  const fileUrl =
    typeof c.fileUrl === 'string' && c.fileUrl.trim()
      ? c.fileUrl.trim()
      : typeof c.fileRef === 'string' && c.fileRef.trim()
        ? c.fileRef.trim()
        : null;
  return {
    ...c,
    fileUrl,
    signedAt: c.signedAt ?? null,
  };
}

export function normalizeStoredPayment(p: StoredDealPayment): StoredDealPayment {
  return {
    ...p,
    amount: typeof p.amount === 'number' && Number.isFinite(p.amount) ? p.amount : 0,
    currency: typeof p.currency === 'string' && p.currency.trim() ? p.currency.trim() : 'USD',
    provider: typeof p.provider === 'string' && p.provider.trim() ? p.provider.trim() : 'placeholder',
    providerReference: typeof p.providerReference === 'string' ? p.providerReference : '',
    releaseCondition: typeof p.releaseCondition === 'string' && p.releaseCondition.trim() ? p.releaseCondition : 'deal_completion',
    paidAt: p.paidAt ?? null,
  };
}

export function normalizeStoredActivity(a: StoredDealActivity, deal: StoredDeal): StoredDealActivity {
  const eventType = (a.eventType ?? a.type ?? 'deal_created') as DealActivityEventType;
  const payload = a.metadata && typeof a.metadata === 'object' ? a.metadata : a.payload != null ? { ...a.payload } : {};
  const metadata: Record<string, unknown> = { ...payload };
  const actorId = a.actorId ?? a.actorUserId ?? null;
  const actorType = a.actorType ?? inferActorType(actorId, deal);
  const { entityType, entityId } =
    a.entityType && a.entityId
      ? { entityType: a.entityType, entityId: a.entityId }
      : entityFromLegacyEvent(eventType, deal._id, metadata);
  return {
    ...a,
    eventType,
    entityType,
    entityId,
    actorType,
    actorId,
    metadata,
  };
}

/** Build frozen deliverable specs from a legacy snapshot (no `frozen` block). */
export function legacyFrozenSpecsFromTermsSnapshot(termsSnapshot: Record<string, unknown>): DealTermsFrozenDeliverableSpec[] {
  const sd = termsSnapshot.structuredDraft as Record<string, unknown> | null | undefined;
  const wizard =
    sd && typeof sd === 'object' && !Array.isArray(sd) && sd.wizard != null && typeof sd.wizard === 'object'
      ? (sd.wizard as Record<string, unknown>)
      : undefined;
  const basics = wizard?.basics as Record<string, unknown> | undefined;
  const dealType = basics?.dealType === 'appearance' ? 'appearance' : 'ugc';
  const baseTitle =
    typeof basics?.offerName === 'string' && basics.offerName.trim() ? basics.offerName.trim() : 'Campaign deliverable';
  const details = typeof basics?.details === 'string' ? basics.details : '';
  const dueAt = typeof basics?.dueDate === 'string' && basics.dueDate.trim() ? basics.dueDate.trim() : null;
  const contentControl = wizard?.contentControl as Record<string, unknown> | undefined;
  const revisionLimit = Math.max(0, Math.floor(Number(contentControl?.revisionRounds) || 2));
  const draftRequired = contentControl?.brandApprovalRequired !== false;

  if (dealType === 'appearance') {
    return [
      {
        title: baseTitle,
        type: 'appearance_event' as DeliverableType,
        instructions: details,
        dueAt,
        draftRequired,
        publishRequired: false,
        proofRequired: false,
        disclosureRequired: true,
        revisionLimit,
      },
    ];
  }
  const ugc = wizard?.ugc as Record<string, unknown> | undefined;
  const rawCount = typeof ugc?.assetCount === 'number' ? ugc.assetCount : 1;
  const n = Math.max(1, Math.min(12, Number.isFinite(rawCount) ? rawCount : 1));
  const out: DealTermsFrozenDeliverableSpec[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      title: `${baseTitle} — asset ${i + 1} of ${n}`,
      type: 'instagram_post',
      instructions: details,
      dueAt,
      draftRequired,
      publishRequired: true,
      proofRequired: true,
      disclosureRequired: true,
      revisionLimit,
    });
  }
  return out;
}
