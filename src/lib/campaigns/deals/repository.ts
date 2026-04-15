import {
  mutateLocalCampaignStore,
  readLocalCampaignStore,
  type LocalCampaignStoreSnapshot,
  type StoredApplication,
  type StoredCampaign,
  type StoredOffer,
} from '@/lib/campaigns/localCampaignStore';
import { claimSeedBusinessOwnershipForBrandUser, ensureSeedCampaignsPresent } from '@/lib/campaigns/repository';
import { SEED_BRAND_USER_ID } from '@/lib/campaigns/seedCampaigns';
import { newObjectIdHex } from '@/lib/generateId';
import { validateApplicationInput, validateOfferInput } from '@/lib/campaigns/validateCampaignRecords';
import {
  applySeedDealLifecycleGraph,
  ensureSeedDealGraphUsersPresent,
  SEED_DEAL_GRAPH_IDS,
} from '@/lib/campaigns/deals/seedDealLifecycle';
import { assertDealStatusTransition, assertContractStatusTransition, dealTransitionRequiresSignedContract } from './dealTransitions';
import { assertDeliverableStatusTransition } from './deliverableTransitions';
import { assertSubmissionStatusTransition } from './submissionTransitions';
import { assertPaymentStatusTransition } from './paymentTransitions';
import { buildTermsSnapshotFromOffer, getFrozenDeliverableSpecs } from './termsSnapshot';
import {
  legacyFrozenSpecsFromTermsSnapshot,
  normalizeStoredActivity,
  normalizeStoredContract,
  normalizeStoredDeliverable,
  normalizeStoredPayment,
  normalizeStoredSubmission,
} from './migrateLegacy';
import { computeDealNextAction, refineNextActionWithDeliverables } from './nextAction';
import { notifyDealPlaceholder } from './notifications';
import type {
  ActivityActorType,
  ActivityEntityType,
  ContractStatus,
  DealActivityEventType,
  DealNextActor,
  DealStatus,
  DeliverableStatus,
  PaymentStatus,
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

function idStr(doc: { _id?: unknown }): string {
  if (doc._id == null) return '';
  return String(doc._id);
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureDealBuckets(draft: {
  deals?: StoredDeal[];
  deliverables?: StoredDeliverable[];
  submissions?: StoredSubmission[];
  dealContracts?: StoredDealContract[];
  dealPayments?: StoredDealPayment[];
  dealActivities?: StoredDealActivity[];
}) {
  if (!Array.isArray(draft.deals)) draft.deals = [];
  if (!Array.isArray(draft.deliverables)) draft.deliverables = [];
  if (!Array.isArray(draft.submissions)) draft.submissions = [];
  if (!Array.isArray(draft.dealContracts)) draft.dealContracts = [];
  if (!Array.isArray(draft.dealPayments)) draft.dealPayments = [];
  if (!Array.isArray(draft.dealActivities)) draft.dealActivities = [];
}

function ensureDealBucketsAndMigrate(draft: LocalCampaignStoreSnapshot): void {
  ensureDealBuckets(draft);
  synchronizeLegacyDealRows(draft);
}

function synchronizeLegacyDealRows(draft: {
  deals: StoredDeal[];
  deliverables: StoredDeliverable[];
  submissions: StoredSubmission[];
  dealContracts: StoredDealContract[];
  dealPayments: StoredDealPayment[];
  dealActivities: StoredDealActivity[];
}): void {
  for (let i = 0; i < draft.deliverables.length; i++) {
    draft.deliverables[i] = normalizeStoredDeliverable({ ...draft.deliverables[i] } as StoredDeliverable);
  }
  for (let i = 0; i < draft.submissions.length; i++) {
    draft.submissions[i] = normalizeStoredSubmission({ ...draft.submissions[i] } as StoredSubmission);
  }
  for (let i = 0; i < draft.dealContracts.length; i++) {
    draft.dealContracts[i] = normalizeStoredContract({ ...draft.dealContracts[i] } as StoredDealContract);
  }
  for (let i = 0; i < draft.dealPayments.length; i++) {
    draft.dealPayments[i] = normalizeStoredPayment({ ...draft.dealPayments[i] } as StoredDealPayment);
  }
  for (let i = 0; i < draft.dealActivities.length; i++) {
    const a = { ...draft.dealActivities[i] } as StoredDealActivity;
    const deal = draft.deals.find((d) => idStr(d) === a.dealId);
    if (deal) {
      draft.dealActivities[i] = normalizeStoredActivity(a, deal);
    }
  }
}

function allDeliverablesCompleted(draft: { deliverables: StoredDeliverable[] }, dealId: string): boolean {
  const rows = listDeliverablesForDealDraft(draft, dealId);
  return rows.length > 0 && rows.every((d) => d.status === 'completed');
}

function actorTypeForUser(
  deal: StoredDeal,
  userId: string | null,
  campaigns: StoredCampaign[] = []
): ActivityActorType {
  if (!userId) return 'system';
  if (deal.athleteUserId === userId) return 'athlete';
  if (deal.brandUserId === userId) return 'business';
  if (
    campaigns.length > 0 &&
    deal.brandUserId === SEED_BRAND_USER_ID &&
    deal.campaignId != null &&
    String(deal.campaignId).trim() !== ''
  ) {
    const cid = String(deal.campaignId);
    const c = campaigns.find((x) => idStr(x) === cid);
    if (c && String(c.brandUserId) === userId) return 'business';
  }
  return 'system';
}

function getContract(draft: { dealContracts: StoredDealContract[] }, id: string): StoredDealContract | null {
  return draft.dealContracts.find((c) => idStr(c) === id) ?? null;
}

function getDeal(draft: { deals: StoredDeal[] }, id: string): StoredDeal | null {
  return draft.deals.find((d) => idStr(d) === id) ?? null;
}

function listDeliverablesForDealDraft(draft: { deliverables: StoredDeliverable[] }, dealId: string) {
  return draft.deliverables.filter((x) => x.dealId === dealId).sort((a, b) => a.order - b.order);
}

async function ensureSeedDealsPresent(): Promise<void> {
  await ensureSeedDealGraphUsersPresent();
  await ensureSeedCampaignsPresent();
  const snap = await readLocalCampaignStore();
  if (SEED_DEAL_GRAPH_IDS.every((id) => snap.deals.some((d) => idStr(d) === id))) {
    return;
  }
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    applySeedDealLifecycleGraph(draft);
  });
}

function refreshDealNextActionInDraft(
  draft: {
    deals: StoredDeal[];
    deliverables: StoredDeliverable[];
    dealContracts: StoredDealContract[];
    dealPayments: StoredDealPayment[];
  },
  dealId: string
): void {
  const deal = getDeal(draft, dealId);
  if (!deal) return;
  const contract = draft.dealContracts.find((c) => idStr(c) === deal.contractId) ?? null;
  const payment = draft.dealPayments.find((p) => idStr(p) === deal.paymentId) ?? null;
  const deliverables = listDeliverablesForDealDraft(draft, dealId);
  const base = computeDealNextAction({ deal, contract, payment, deliverables });
  const refined = refineNextActionWithDeliverables(base, deal, deliverables);
  const idx = draft.deals.findIndex((d) => idStr(d) === dealId);
  if (idx < 0) return;
  const t = nowIso();
  draft.deals[idx] = {
    ...draft.deals[idx],
    nextActionOwner: refined.nextActionOwner,
    nextActionLabel: refined.nextActionLabel,
    updatedAt: t,
  };
}

function pushActivity(
  draft: { dealActivities: StoredDealActivity[] },
  row: {
    dealId: string;
    eventType: DealActivityEventType;
    entityType: ActivityEntityType;
    entityId: string;
    actorType: ActivityActorType;
    actorId: string | null;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }
) {
  const _id = newObjectIdHex();
  draft.dealActivities.push({
    _id,
    dealId: row.dealId,
    entityType: row.entityType,
    entityId: row.entityId,
    actorType: row.actorType,
    actorId: row.actorId,
    eventType: row.eventType,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt ?? nowIso(),
  });
}

export type FinalizeAcceptanceContext =
  | { mode: 'athlete'; athleteUserId: string }
  | { mode: 'system' };

export type FinalizeAcceptanceResult =
  | { ok: true; deal: StoredDeal }
  | { ok: false; status: number; error: string; details?: Record<string, unknown> };

/**
 * Single-store transaction: snapshot terms from offer, mark accepted, open deal graph.
 */
export async function finalizeOfferAcceptanceAndOpenDeal(
  offerId: string,
  ctx: FinalizeAcceptanceContext
): Promise<FinalizeAcceptanceResult> {
  let out: FinalizeAcceptanceResult | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const oidx = draft.offers.findIndex((o) => idStr(o) === offerId);
    if (oidx < 0) {
      out = { ok: false, status: 404, error: 'Offer not found' };
      return;
    }
    const offer = draft.offers[oidx] as StoredOffer;
    const existingDealId = offer.dealId != null ? String(offer.dealId) : '';
    if (existingDealId) {
      const d = getDeal(draft, existingDealId);
      if (d) {
        out = { ok: true, deal: d };
        return;
      }
    }
    if (String(offer.status ?? '') !== 'sent') {
      out = {
        ok: false,
        status: 400,
        error: 'Offer must be in sent status to accept',
        details: { status: offer.status },
      };
      return;
    }
    if (ctx.mode === 'athlete' && String(offer.athleteUserId ?? '') !== ctx.athleteUserId) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }

    const termsSnapshot = buildTermsSnapshotFromOffer(offer);
    const cid =
      offer.campaignId != null && String(offer.campaignId).trim() !== ''
        ? String(offer.campaignId)
        : '';
    const aid =
      offer.applicationId != null && String(offer.applicationId).trim() !== ''
        ? String(offer.applicationId)
        : '';
    const sd = offer.structuredDraft as Record<string, unknown> | undefined;
    const oc =
      sd && typeof sd === 'object' && !Array.isArray(sd)
        ? (sd.originContext as Record<string, unknown> | undefined)
        : undefined;
    const chatThreadId =
      oc && typeof oc.chatThreadId === 'string' && oc.chatThreadId.trim() ? oc.chatThreadId.trim() : null;

    const dealId = newObjectIdHex();
    const contractId = newObjectIdHex();
    const paymentId = newObjectIdHex();
    const t = nowIso();

    const contract: StoredDealContract = {
      _id: contractId,
      dealId,
      status: 'not_added',
      fileUrl: null,
      signedAt: null,
      createdAt: t,
      updatedAt: t,
    };
    const comp = termsSnapshot.frozen.compensationSummary;
    const paymentAmount = typeof comp.amount === 'number' && Number.isFinite(comp.amount) ? comp.amount : 0;
    const payment: StoredDealPayment = {
      _id: paymentId,
      dealId,
      amount: paymentAmount,
      currency: 'USD',
      status: 'not_configured',
      provider: 'placeholder',
      providerReference: '',
      releaseCondition: 'all_deliverables_completed',
      paidAt: null,
      createdAt: t,
      updatedAt: t,
    };

    const deal: StoredDeal = {
      _id: dealId,
      offerId,
      brandUserId: String(offer.brandUserId ?? ''),
      athleteUserId: String(offer.athleteUserId ?? ''),
      campaignId: cid || null,
      applicationId: aid || null,
      chatThreadId,
      termsSnapshot,
      status: 'created',
      contractId,
      paymentId,
      nextActionOwner: 'brand',
      nextActionLabel: 'Advance deal to contract phase',
      createdAt: t,
      updatedAt: t,
    };

    draft.dealContracts.push(contract);
    draft.dealPayments.push(payment);

    let specs = getFrozenDeliverableSpecs(termsSnapshot);
    if (specs.length === 0) {
      specs = legacyFrozenSpecsFromTermsSnapshot(termsSnapshot as unknown as Record<string, unknown>);
    }
    for (let order = 0; order < specs.length; order++) {
      const spec = specs[order]!;
      const did = newObjectIdHex();
      const row: StoredDeliverable = {
        _id: did,
        dealId,
        title: spec.title,
        order,
        type: spec.type,
        instructions: spec.instructions,
        status: 'not_started',
        dueAt: spec.dueAt,
        draftRequired: spec.draftRequired,
        publishRequired: spec.publishRequired,
        proofRequired: spec.proofRequired,
        disclosureRequired: spec.disclosureRequired,
        revisionLimit: spec.revisionLimit,
        revisionCountUsed: 0,
        createdAt: t,
        updatedAt: t,
      };
      draft.deliverables.push(row);
    }

    draft.deals.push(deal);

    pushActivity(draft, {
      dealId,
      eventType: 'deal_created',
      entityType: 'deal',
      entityId: dealId,
      actorType: ctx.mode === 'athlete' ? 'athlete' : 'system',
      actorId: ctx.mode === 'athlete' ? ctx.athleteUserId : null,
      metadata: { offerId },
      createdAt: t,
    });

    const resolveCampaign = (campaignId: string) =>
      draft.campaigns.find((c) => idStr(c) === campaignId) ?? null;
    const mergedOffer = { ...offer } as Record<string, unknown>;
    mergedOffer.status = 'accepted';
    mergedOffer.dealId = dealId;
    mergedOffer.acceptedAt = new Date(t);
    try {
      const validated = validateOfferInput(mergedOffer, cid ? { campaignById: resolveCampaign } : undefined) as StoredOffer;
      draft.offers[oidx] = { ...validated, _id: idStr(offer) || idStr(validated) } as StoredOffer;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Offer update failed';
      // rollback in-memory draft by removing added rows
      draft.deals = draft.deals.filter((d) => idStr(d) !== dealId);
      draft.deliverables = draft.deliverables.filter((d) => d.dealId !== dealId);
      draft.dealContracts = draft.dealContracts.filter((c) => idStr(c) !== contractId);
      draft.dealPayments = draft.dealPayments.filter((p) => idStr(p) !== paymentId);
      draft.dealActivities = draft.dealActivities.filter((a) => a.dealId !== dealId);
      out = { ok: false, status: 400, error: msg };
      return;
    }

    refreshDealNextActionInDraft(draft, dealId);
    notifyDealPlaceholder('deal_opened', { dealId, offerId });
    out = { ok: true, deal: getDeal(draft, dealId)! };
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export async function sendOfferToAthlete(
  offerId: string,
  brandUserId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  let out: { ok: true } | { ok: false; status: number; error: string } | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const oidx = draft.offers.findIndex((o) => idStr(o) === offerId);
    if (oidx < 0) {
      out = { ok: false, status: 404, error: 'Offer not found' };
      return;
    }
    const offer = draft.offers[oidx] as StoredOffer;
    if (String(offer.brandUserId ?? '') !== brandUserId) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    if (String(offer.status ?? 'draft') !== 'draft') {
      out = { ok: false, status: 400, error: 'Only draft offers can be sent' };
      return;
    }
    const cid =
      offer.campaignId != null && String(offer.campaignId).trim() !== ''
        ? String(offer.campaignId)
        : '';
    const resolveCampaign = (campaignId: string) =>
      draft.campaigns.find((c) => idStr(c) === campaignId) ?? null;
    const merged = { ...offer, status: 'sent', sentAt: new Date() } as Record<string, unknown>;
    try {
      const validated = validateOfferInput(merged, cid ? { campaignById: resolveCampaign } : undefined) as StoredOffer;
      draft.offers[oidx] = { ...validated, _id: idStr(offer) || idStr(validated) } as StoredOffer;
      const linkedApplicationId =
        offer.applicationId != null && String(offer.applicationId).trim() !== ''
          ? String(offer.applicationId)
          : '';
      if (linkedApplicationId) {
        const appIdx = draft.applications.findIndex((a) => idStr(a) === linkedApplicationId);
        if (appIdx >= 0) {
          const app = draft.applications[appIdx];
          const appNext = {
            ...app,
            status: 'offer_sent',
            offerSentAt: new Date(),
          };
          try {
            validateApplicationInput(appNext as Record<string, unknown>);
            draft.applications[appIdx] = appNext as StoredApplication;
          } catch {
            // Do not fail offer send if app status metadata patch fails validation.
          }
        }
      }
      out = { ok: true };
    } catch (e) {
      out = { ok: false, status: 400, error: e instanceof Error ? e.message : 'Invalid offer' };
    }
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export async function declineOfferByAthlete(
  offerId: string,
  athleteUserId: string,
  declineReason?: string,
  declineNote?: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  let out: { ok: true } | { ok: false; status: number; error: string } | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const oidx = draft.offers.findIndex((o) => idStr(o) === offerId);
    if (oidx < 0) {
      out = { ok: false, status: 404, error: 'Offer not found' };
      return;
    }
    const offer = draft.offers[oidx] as StoredOffer;
    if (String(offer.athleteUserId ?? '') !== athleteUserId) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    if (String(offer.status ?? '') !== 'sent') {
      out = { ok: false, status: 400, error: 'Only sent offers can be declined' };
      return;
    }
    const cid =
      offer.campaignId != null && String(offer.campaignId).trim() !== ''
        ? String(offer.campaignId)
        : '';
    const resolveCampaign = (campaignId: string) =>
      draft.campaigns.find((c) => idStr(c) === campaignId) ?? null;
    const merged = { ...offer, status: 'declined', declinedAt: new Date() } as Record<string, unknown>;
    const reason = typeof declineReason === 'string' ? declineReason.trim() : '';
    const note = typeof declineNote === 'string' ? declineNote.trim() : '';
    if (reason) {
      merged.declineReason = reason;
    }
    if (note) {
      merged.declineNote = note;
    }
    try {
      const validated = validateOfferInput(merged, cid ? { campaignById: resolveCampaign } : undefined) as StoredOffer;
      draft.offers[oidx] = { ...validated, _id: idStr(offer) || idStr(validated) } as StoredOffer;
      const linkedApplicationId =
        offer.applicationId != null && String(offer.applicationId).trim() !== ''
          ? String(offer.applicationId)
          : '';
      if (linkedApplicationId) {
        const appIdx = draft.applications.findIndex((a) => idStr(a) === linkedApplicationId);
        if (appIdx >= 0) {
          const app = draft.applications[appIdx];
          const from = String(app.status ?? '');
          if (from === 'offer_sent' || from === 'approved') {
            const appNext = {
              ...app,
              status: 'offer_declined',
              offerDeclinedAt: new Date(),
            };
            try {
              validateApplicationInput(appNext as Record<string, unknown>);
              draft.applications[appIdx] = appNext as StoredApplication;
            } catch {
              // Do not fail offer decline if app status metadata patch fails validation.
            }
          }
        }
      }
      out = { ok: true };
    } catch (e) {
      out = { ok: false, status: 400, error: e instanceof Error ? e.message : 'Invalid offer' };
    }
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

function participantAllowed(
  deal: StoredDeal,
  userId: string,
  role: 'brand' | 'athlete',
  campaigns: StoredCampaign[]
): boolean {
  if (role === 'athlete' && deal.athleteUserId === userId) return true;
  if (role === 'brand') {
    if (deal.brandUserId === userId) return true;
    // Demo graph: deals may still reference the synthetic seed brand while campaigns were claimed to the real account.
    if (deal.brandUserId === SEED_BRAND_USER_ID && deal.campaignId != null && String(deal.campaignId).trim() !== '') {
      const cid = String(deal.campaignId);
      const c = campaigns.find((x) => idStr(x) === cid);
      if (c && String(c.brandUserId) === userId) return true;
    }
  }
  return false;
}

export async function getDealByIdForUser(
  dealId: string,
  userId: string,
  role: 'brand' | 'athlete'
): Promise<
  | {
      ok: true;
      deal: StoredDeal;
      contract: StoredDealContract | null;
      payment: StoredDealPayment | null;
      deliverables: StoredDeliverable[];
      activities: StoredDealActivity[];
    }
  | { ok: false; status: number; error: string }
> {
  await ensureSeedDealsPresent();
  if (role === 'brand') {
    await claimSeedBusinessOwnershipForBrandUser(userId);
  }
  const snap = await readLocalCampaignStore();
  ensureDealBuckets(snap);
  const deal = snap.deals.find((d) => idStr(d) === dealId);
  if (!deal) return { ok: false, status: 404, error: 'Deal not found' };
  if (!participantAllowed(deal, userId, role, snap.campaigns)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  const contractRaw = snap.dealContracts.find((c) => idStr(c) === deal.contractId) ?? null;
  const paymentRaw = snap.dealPayments.find((p) => idStr(p) === deal.paymentId) ?? null;
  const deliverables = snap.deliverables
    .filter((d) => d.dealId === dealId)
    .sort((a, b) => a.order - b.order)
    .map((d) => normalizeStoredDeliverable({ ...d }));
  const activities = snap.dealActivities
    .filter((a) => a.dealId === dealId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((a) => normalizeStoredActivity({ ...a } as StoredDealActivity, deal));
  const contract = contractRaw ? normalizeStoredContract({ ...contractRaw }) : null;
  const payment = paymentRaw ? normalizeStoredPayment({ ...paymentRaw }) : null;
  return { ok: true, deal, contract, payment, deliverables, activities };
}

export async function listDealsForUser(
  userId: string,
  role: 'brand' | 'athlete',
  status?: string
): Promise<StoredDeal[]> {
  await ensureSeedDealsPresent();
  if (role === 'brand') {
    await claimSeedBusinessOwnershipForBrandUser(userId);
  }
  const snap = await readLocalCampaignStore();
  ensureDealBuckets(snap);
  const rows = snap.deals.filter((d) => participantAllowed(d, userId, role, snap.campaigns));
  if (typeof status === 'string' && status.trim()) {
    return rows.filter((d) => d.status === status.trim());
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export type PatchDealStatusResult =
  | { ok: true; deal: StoredDeal }
  | { ok: false; status: number; error: string; details?: Record<string, unknown> };

export async function patchDealStatusForUser(
  dealId: string,
  userId: string,
  role: 'brand' | 'athlete',
  nextStatus: DealStatus
): Promise<PatchDealStatusResult> {
  let out: PatchDealStatusResult | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const deal = getDeal(draft, dealId);
    if (!deal) {
      out = { ok: false, status: 404, error: 'Deal not found' };
      return;
    }
    if (!participantAllowed(deal, userId, role, draft.campaigns)) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    const from = deal.status;
    try {
      assertDealStatusTransition(from, nextStatus);
    } catch (e) {
      out = {
        ok: false,
        status: 400,
        error: e instanceof Error ? e.message : 'Invalid transition',
        details: { from, to: nextStatus },
      };
      return;
    }
    if (dealTransitionRequiresSignedContract(from, nextStatus)) {
      const c = getContract(draft, deal.contractId);
      if (!c || c.status !== 'signed') {
        out = {
          ok: false,
          status: 400,
          error: 'Contract must be signed before activating deal',
          details: { contractStatus: c?.status },
        };
        return;
      }
    }
    if (nextStatus === 'approved_completed' && !allDeliverablesCompleted(draft, dealId)) {
      out = {
        ok: false,
        status: 400,
        error: 'All deliverables must be completed before marking the deal approved',
        details: { deliverables: listDeliverablesForDealDraft(draft, dealId).map((d) => d.status) },
      };
      return;
    }
    const t = nowIso();
    const idx = draft.deals.findIndex((d) => idStr(d) === dealId);
    draft.deals[idx] = { ...deal, status: nextStatus, updatedAt: t };

    if (nextStatus === 'approved_completed') {
      pushActivity(draft, {
        dealId,
        eventType: 'deal_completed',
        entityType: 'deal',
        entityId: dealId,
        actorType: actorTypeForUser(deal, userId, draft.campaigns),
        actorId: userId,
        metadata: { source: 'manual_status' },
        createdAt: t,
      });
      notifyDealPlaceholder('deal_completed', { dealId });
      notifyDealPlaceholder('payment_pending', { dealId, reason: 'deal_approved_completed' });
    }

    refreshDealNextActionInDraft(draft, dealId);
    out = { ok: true, deal: getDeal(draft, dealId)! };
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export async function listDeliverablesForDealForUser(
  dealId: string,
  userId: string,
  role: 'brand' | 'athlete'
): Promise<{ ok: true; deliverables: StoredDeliverable[] } | { ok: false; status: number; error: string }> {
  const r = await getDealByIdForUser(dealId, userId, role);
  if (!r.ok) return r;
  return { ok: true, deliverables: r.deliverables };
}

function deliverableDeal(
  draft: { deals: StoredDeal[] },
  deliverable: StoredDeliverable
): StoredDeal | null {
  return draft.deals.find((d) => idStr(d) === deliverable.dealId) ?? null;
}

export async function patchDeliverableForUser(
  deliverableId: string,
  userId: string,
  role: 'brand' | 'athlete',
  patch: { status?: DeliverableStatus; title?: string; description?: string; instructions?: string }
): Promise<
  | { ok: true; deliverable: StoredDeliverable }
  | { ok: false; status: number; error: string }
> {
  let out:
    | { ok: true; deliverable: StoredDeliverable }
    | { ok: false; status: number; error: string }
    | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const idx = draft.deliverables.findIndex((d) => idStr(d) === deliverableId);
    if (idx < 0) {
      out = { ok: false, status: 404, error: 'Deliverable not found' };
      return;
    }
    const row = draft.deliverables[idx];
    const deal = deliverableDeal(draft, row);
    if (!deal || !participantAllowed(deal, userId, role, draft.campaigns)) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    const t = nowIso();
    let next = { ...row, updatedAt: t };
    if (patch.title !== undefined) next = { ...next, title: String(patch.title).trim() || row.title };
    if (patch.description !== undefined) {
      const desc = String(patch.description);
      next = { ...next, description: desc, instructions: desc };
    }
    if (patch.instructions !== undefined) next = { ...next, instructions: String(patch.instructions) };
    if (patch.status !== undefined) {
      try {
        assertDeliverableStatusTransition(row.status, patch.status);
      } catch (e) {
        out = { ok: false, status: 400, error: e instanceof Error ? e.message : 'Invalid status' };
        return;
      }
      next = { ...next, status: patch.status };
      if (patch.status === 'completed') {
        pushActivity(draft, {
          dealId: deal._id,
          eventType: 'deliverable_completed',
          entityType: 'deliverable',
          entityId: deliverableId,
          actorType: actorTypeForUser(deal, userId, draft.campaigns),
          actorId: userId,
          metadata: { deliverableId },
          createdAt: t,
        });
        notifyDealPlaceholder('deliverable_completed', { dealId: deal._id, deliverableId });
      }
    }
    draft.deliverables[idx] = next;
    refreshDealNextActionInDraft(draft, deal._id);
    out = { ok: true, deliverable: next };
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export type CreateSubmissionBody = {
  body?: string;
  notes?: string;
  submissionType?: SubmissionType;
  artifacts?: SubmissionArtifact[];
};

function coerceArtifacts(body: CreateSubmissionBody): SubmissionArtifact[] {
  if (Array.isArray(body.artifacts) && body.artifacts.length) {
    return body.artifacts.map((a) => ({ ...a }));
  }
  const legacy = typeof body.body === 'string' ? body.body.trim() : '';
  if (legacy) return [{ kind: 'text', text: legacy }];
  return [];
}

export async function createSubmissionForDeliverable(
  deliverableId: string,
  userId: string,
  role: 'brand' | 'athlete',
  body: CreateSubmissionBody
): Promise<
  | { ok: true; submission: StoredSubmission }
  | { ok: false; status: number; error: string }
> {
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const artifacts = coerceArtifacts(body);
  if (!notes && artifacts.length === 0) {
    return { ok: false, status: 400, error: 'Provide notes and/or artifacts (or legacy body)' };
  }
  if (role !== 'athlete') {
    return { ok: false, status: 403, error: 'Only athletes can submit deliverable work' };
  }
  let out:
    | { ok: true; submission: StoredSubmission }
    | { ok: false; status: number; error: string }
    | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const didx = draft.deliverables.findIndex((d) => idStr(d) === deliverableId);
    if (didx < 0) {
      out = { ok: false, status: 404, error: 'Deliverable not found' };
      return;
    }
    const del = normalizeStoredDeliverable({ ...draft.deliverables[didx] } as StoredDeliverable);
    const deal = deliverableDeal(draft, del);
    if (!deal || deal.athleteUserId !== userId) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    try {
      assertDeliverableStatusTransition(del.status, 'draft_submitted');
    } catch (e) {
      out = { ok: false, status: 400, error: e instanceof Error ? e.message : 'Deliverable not ready for submission' };
      return;
    }
    const subs = draft.submissions.filter((s) => s.deliverableId === idStr(del));
    const maxVer = subs.length ? Math.max(...subs.map((s) => (typeof s.version === 'number' ? s.version : 0))) : 0;
    const version = maxVer + 1;
    const hasFiles = artifacts.some((a) => a.kind === 'file');
    const hasUrls = artifacts.some((a) => a.kind === 'url');
    const hasText = artifacts.some((a) => a.kind === 'text');
    let submissionType: SubmissionType =
      body.submissionType && ['file', 'url', 'text', 'mixed'].includes(body.submissionType)
        ? body.submissionType
        : 'text';
    if (!body.submissionType) {
      const n = (hasFiles ? 1 : 0) + (hasUrls ? 1 : 0) + (hasText ? 1 : 0);
      if (n > 1) submissionType = 'mixed';
      else if (hasFiles) submissionType = 'file';
      else if (hasUrls) submissionType = 'url';
      else submissionType = 'text';
    }
    const t = nowIso();
    const sid = newObjectIdHex();
    const submission: StoredSubmission = {
      _id: sid,
      deliverableId: idStr(del),
      dealId: deal._id,
      version,
      submittedBy: userId,
      submittedAt: t,
      submissionType,
      artifacts,
      notes,
      status: 'submitted',
      reviewedBy: null,
      reviewedAt: null,
      feedback: null,
      createdAt: t,
      updatedAt: t,
    };
    draft.submissions.push(submission);

    const dNext: StoredDeliverable = {
      ...del,
      status: 'draft_submitted',
      updatedAt: t,
    };
    draft.deliverables[didx] = dNext;

    pushActivity(draft, {
      dealId: deal._id,
      eventType: 'submission_submitted',
      entityType: 'submission',
      entityId: sid,
      actorType: 'athlete',
      actorId: userId,
      metadata: { deliverableId: idStr(del), submissionId: sid },
      createdAt: t,
    });
    notifyDealPlaceholder('submission_submitted', { dealId: deal._id, submissionId: sid });

    const dealIdx = draft.deals.findIndex((d) => idStr(d) === deal._id);
    if (dealIdx >= 0) {
      const ds = draft.deals[dealIdx];
      if (ds.status === 'revision_requested') {
        try {
          assertDealStatusTransition(ds.status, 'submission_in_progress');
          draft.deals[dealIdx] = {
            ...ds,
            status: 'submission_in_progress',
            updatedAt: t,
          };
        } catch {
          /* ignore invalid transition */
        }
      } else if (ds.status === 'active' || ds.status === 'created' || ds.status === 'contract_pending') {
        draft.deals[dealIdx] = {
          ...ds,
          status: 'submission_in_progress',
          updatedAt: t,
        };
      }
    }

    refreshDealNextActionInDraft(draft, deal._id);
    out = { ok: true, submission };
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export async function listSubmissionsForDeliverableForUser(
  deliverableId: string,
  userId: string,
  role: 'brand' | 'athlete'
): Promise<
  | { ok: true; submissions: StoredSubmission[] }
  | { ok: false; status: number; error: string }
> {
  const snap = await readLocalCampaignStore();
  ensureDealBuckets(snap);
  const del = snap.deliverables.find((d) => idStr(d) === deliverableId);
  if (!del) return { ok: false, status: 404, error: 'Deliverable not found' };
  const deal = snap.deals.find((d) => idStr(d) === del.dealId);
  if (!deal || !participantAllowed(deal, userId, role, snap.campaigns)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  const submissions = snap.submissions
    .filter((s) => s.deliverableId === deliverableId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((s) => normalizeStoredSubmission({ ...s }));
  return { ok: true, submissions };
}

export async function patchSubmissionForUser(
  submissionId: string,
  userId: string,
  role: 'brand' | 'athlete',
  patch: { status?: SubmissionStatus; feedback?: string | null }
): Promise<
  | { ok: true; submission: StoredSubmission }
  | { ok: false; status: number; error: string }
> {
  let out:
    | { ok: true; submission: StoredSubmission }
    | { ok: false; status: number; error: string }
    | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const sidx = draft.submissions.findIndex((s) => idStr(s) === submissionId);
    if (sidx < 0) {
      out = { ok: false, status: 404, error: 'Submission not found' };
      return;
    }
    const sub = normalizeStoredSubmission({ ...draft.submissions[sidx] } as StoredSubmission);
    const deal = getDeal(draft, sub.dealId);
    if (!deal || !participantAllowed(deal, userId, role, draft.campaigns)) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    if (role !== 'brand') {
      out = { ok: false, status: 403, error: 'Only the brand can update submission status' };
      return;
    }
    if (patch.status === undefined) {
      out = { ok: false, status: 400, error: 'status is required' };
      return;
    }
    const t = nowIso();
    try {
      assertSubmissionStatusTransition(sub.status, patch.status);
    } catch (e) {
      out = { ok: false, status: 400, error: e instanceof Error ? e.message : 'Invalid status' };
      return;
    }

    const didx = draft.deliverables.findIndex((d) => idStr(d) === sub.deliverableId);
    const curD =
      didx >= 0 ? normalizeStoredDeliverable({ ...draft.deliverables[didx] } as StoredDeliverable) : null;

    if (patch.status === 'revision_requested' && curD && curD.revisionCountUsed >= curD.revisionLimit) {
      out = { ok: false, status: 400, error: 'Revision limit reached for this deliverable' };
      notifyDealPlaceholder('deal_revision_blocked', {
        dealId: deal._id,
        deliverableId: sub.deliverableId,
        submissionId,
      });
      return;
    }

    const dealIdxPre = draft.deals.findIndex((d) => idStr(d) === deal._id);
    const curDealPre = dealIdxPre >= 0 ? draft.deals[dealIdxPre]! : deal;

    if (patch.status === 'approved' && curD) {
      try {
        assertDeliverableStatusTransition(curD.status, 'approved');
      } catch (e) {
        out = {
          ok: false,
          status: 400,
          error: e instanceof Error ? e.message : 'Invalid deliverable transition to approved',
        };
        return;
      }
      if (!curD.publishRequired) {
        try {
          assertDeliverableStatusTransition('approved', 'completed');
        } catch (e) {
          out = {
            ok: false,
            status: 400,
            error: e instanceof Error ? e.message : 'Invalid deliverable completion',
          };
          return;
        }
      }
      const simStatus: DeliverableStatus = curD.publishRequired ? 'approved' : 'completed';
      const simList = listDeliverablesForDealDraft(draft, deal._id).map((d) =>
        idStr(d) === idStr(curD)
          ? { ...normalizeStoredDeliverable({ ...d } as StoredDeliverable), status: simStatus }
          : normalizeStoredDeliverable({ ...d } as StoredDeliverable)
      );
      const allDoneSim = simList.length > 0 && simList.every((d) => d.status === 'completed');
      if (allDoneSim) {
        try {
          assertDealStatusTransition(curDealPre.status, 'approved_completed');
        } catch (e) {
          out = {
            ok: false,
            status: 400,
            error: e instanceof Error ? e.message : 'Invalid deal transition to completed',
          };
          return;
        }
      }
    }

    const reviewTouch =
      patch.status === 'viewed' ||
      patch.status === 'approved' ||
      patch.status === 'revision_requested' ||
      patch.status === 'rejected';
    const feedback = patch.feedback !== undefined ? patch.feedback : sub.feedback;
    const nextSubmission: StoredSubmission = {
      ...sub,
      status: patch.status,
      updatedAt: t,
      reviewedBy: reviewTouch ? userId : sub.reviewedBy,
      reviewedAt: reviewTouch ? t : sub.reviewedAt,
      feedback: feedback ?? null,
    };
    draft.submissions[sidx] = nextSubmission;

    if (didx >= 0 && curD) {
      let dStatus = curD.status;
      let revisionCountUsed = curD.revisionCountUsed;
      if (patch.status === 'approved') {
        if (!curD.publishRequired) {
          dStatus = 'completed';
        } else {
          dStatus = 'approved';
        }
        pushActivity(draft, {
          dealId: deal._id,
          eventType: 'submission_approved',
          entityType: 'submission',
          entityId: submissionId,
          actorType: 'business',
          actorId: userId,
          metadata: { submissionId, deliverableId: sub.deliverableId },
          createdAt: t,
        });
        notifyDealPlaceholder('submission_approved', { dealId: deal._id, submissionId });
      } else if (patch.status === 'revision_requested') {
        revisionCountUsed = curD.revisionCountUsed + 1;
        dStatus = 'revision_requested';
        pushActivity(draft, {
          dealId: deal._id,
          eventType: 'revision_requested',
          entityType: 'submission',
          entityId: submissionId,
          actorType: 'business',
          actorId: userId,
          metadata: { submissionId, deliverableId: sub.deliverableId, revisionCountUsed },
          createdAt: t,
        });
        notifyDealPlaceholder('revision_requested', { dealId: deal._id, submissionId });
      } else if (patch.status === 'viewed') {
        try {
          assertDeliverableStatusTransition(curD.status, 'under_review');
          dStatus = 'under_review';
        } catch {
          dStatus = curD.status;
        }
      } else if (patch.status === 'rejected') {
        try {
          assertDeliverableStatusTransition(curD.status, 'revision_requested');
          dStatus = 'revision_requested';
        } catch {
          dStatus = curD.status;
        }
      }
      draft.deliverables[didx] = {
        ...curD,
        status: dStatus,
        revisionCountUsed,
        updatedAt: t,
      };
    }

    const dealIdx = draft.deals.findIndex((d) => idStr(d) === deal._id);
    if (dealIdx >= 0) {
      const curDeal = draft.deals[dealIdx]!;
      let nextDealStatus = curDeal.status;
      if (patch.status === 'viewed' || patch.status === 'revision_requested' || patch.status === 'rejected') {
        if (curDeal.status !== 'approved_completed' && curDeal.status !== 'paid' && curDeal.status !== 'closed') {
          nextDealStatus = 'under_review';
        }
      }
      if (patch.status === 'approved') {
        const allDone = allDeliverablesCompleted(draft, deal._id);
        if (allDone) {
          nextDealStatus = 'approved_completed';
          pushActivity(draft, {
            dealId: deal._id,
            eventType: 'deal_completed',
            entityType: 'deal',
            entityId: deal._id,
            actorType: 'business',
            actorId: userId,
            metadata: { phase: 'all_deliverables_completed' },
            createdAt: t,
          });
          notifyDealPlaceholder('deal_completed', { dealId: deal._id });
          notifyDealPlaceholder('payment_pending', { dealId: deal._id, reason: 'deliverables_completed' });
        } else {
          nextDealStatus = 'under_review';
        }
      }
      draft.deals[dealIdx] = {
        ...curDeal,
        status: nextDealStatus,
        updatedAt: t,
      };
    }

    refreshDealNextActionInDraft(draft, deal._id);
    out = { ok: true, submission: nextSubmission };
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export async function createContractPlaceholderForDeal(
  dealId: string,
  brandUserId: string,
  fileRef?: string,
  fileUrl?: string
): Promise<
  | { ok: true; contract: StoredDealContract }
  | { ok: false; status: number; error: string }
> {
  let out:
    | { ok: true; contract: StoredDealContract }
    | { ok: false; status: number; error: string }
    | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const deal = getDeal(draft, dealId);
    if (!deal) {
      out = { ok: false, status: 404, error: 'Deal not found' };
      return;
    }
    if (!participantAllowed(deal, brandUserId, 'brand', draft.campaigns)) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    const cidx = draft.dealContracts.findIndex((c) => idStr(c) === deal.contractId);
    if (cidx < 0) {
      out = { ok: false, status: 500, error: 'Contract row missing' };
      return;
    }
    const cur = normalizeStoredContract({ ...draft.dealContracts[cidx] } as StoredDealContract);
    const t = nowIso();
    const url =
      fileUrl != null && fileUrl.trim()
        ? fileUrl.trim()
        : fileRef != null && fileRef.trim()
          ? fileRef.trim()
          : cur.fileUrl;
    const next: StoredDealContract = {
      ...cur,
      status: 'uploaded',
      fileUrl: url ?? null,
      updatedAt: t,
    };
    draft.dealContracts[cidx] = next;
    pushActivity(draft, {
      dealId,
      eventType: 'contract_uploaded',
      entityType: 'deal',
      entityId: dealId,
      actorType: 'business',
      actorId: brandUserId,
      metadata: { contractId: idStr(cur) },
      createdAt: t,
    });
    notifyDealPlaceholder('contract_uploaded', { dealId, contractId: idStr(cur) });
    const dealIdx = draft.deals.findIndex((d) => idStr(d) === dealId);
    if (dealIdx >= 0 && draft.deals[dealIdx].status === 'created') {
      draft.deals[dealIdx] = {
        ...draft.deals[dealIdx],
        status: 'contract_pending',
        updatedAt: t,
      };
    }
    refreshDealNextActionInDraft(draft, dealId);
    out = { ok: true, contract: next };
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export async function patchContractStatusForUser(
  contractId: string,
  userId: string,
  role: 'brand' | 'athlete',
  nextStatus: ContractStatus
): Promise<
  | { ok: true; contract: StoredDealContract; deal?: StoredDeal }
  | { ok: false; status: number; error: string }
> {
  let out:
    | { ok: true; contract: StoredDealContract; deal?: StoredDeal }
    | { ok: false; status: number; error: string }
    | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const cidx = draft.dealContracts.findIndex((c) => idStr(c) === contractId);
    if (cidx < 0) {
      out = { ok: false, status: 404, error: 'Contract not found' };
      return;
    }
    const cur = draft.dealContracts[cidx];
    const deal = draft.deals.find((d) => String(d.contractId) === idStr(cur));
    if (!deal || !participantAllowed(deal, userId, role, draft.campaigns)) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    if (nextStatus === 'signed' && role !== 'athlete') {
      out = { ok: false, status: 403, error: 'Only the athlete can mark contract signed' };
      return;
    }
    if (nextStatus !== 'signed' && role !== 'brand') {
      out = { ok: false, status: 403, error: 'Only the brand can update contract workflow before signing' };
      return;
    }
    try {
      assertContractStatusTransition(cur.status, nextStatus);
    } catch (e) {
      out = { ok: false, status: 400, error: e instanceof Error ? e.message : 'Invalid transition' };
      return;
    }
    const t = nowIso();
    const curN = normalizeStoredContract({ ...cur } as StoredDealContract);
    const next: StoredDealContract = {
      ...curN,
      status: nextStatus,
      signedAt: nextStatus === 'signed' ? t : curN.signedAt,
      updatedAt: t,
    };
    draft.dealContracts[cidx] = next;

    if (nextStatus === 'signed') {
      pushActivity(draft, {
        dealId: deal._id,
        eventType: 'contract_signed',
        entityType: 'deal',
        entityId: deal._id,
        actorType: 'athlete',
        actorId: userId,
        metadata: { contractId },
        createdAt: t,
      });
      notifyDealPlaceholder('contract_signed', { dealId: deal._id, contractId });
      const didx = draft.deals.findIndex((d) => idStr(d) === deal._id);
      if (didx >= 0 && draft.deals[didx].status === 'contract_pending') {
        draft.deals[didx] = {
          ...draft.deals[didx],
          status: 'active',
          updatedAt: t,
        };
      }
    }

    refreshDealNextActionInDraft(draft, deal._id);
    const updatedDeal = getDeal(draft, deal._id) ?? undefined;
    out = { ok: true, contract: next, ...(updatedDeal ? { deal: updatedDeal } : {}) };
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export async function getPaymentForDealForUser(
  dealId: string,
  userId: string,
  role: 'brand' | 'athlete'
): Promise<
  | { ok: true; payment: StoredDealPayment }
  | { ok: false; status: number; error: string }
> {
  const r = await getDealByIdForUser(dealId, userId, role);
  if (!r.ok) return r;
  if (!r.payment) return { ok: false, status: 404, error: 'Payment not found' };
  return { ok: true, payment: r.payment };
}

export async function patchPaymentStatusForUser(
  paymentId: string,
  userId: string,
  role: 'brand' | 'athlete',
  nextStatus: PaymentStatus
): Promise<
  | { ok: true; payment: StoredDealPayment; deal?: StoredDeal }
  | { ok: false; status: number; error: string }
> {
  let out:
    | { ok: true; payment: StoredDealPayment; deal?: StoredDeal }
    | { ok: false; status: number; error: string }
    | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureDealBucketsAndMigrate(draft);
    const pidx = draft.dealPayments.findIndex((p) => idStr(p) === paymentId);
    if (pidx < 0) {
      out = { ok: false, status: 404, error: 'Payment not found' };
      return;
    }
    const cur = draft.dealPayments[pidx];
    const deal = draft.deals.find((d) => d.paymentId === idStr(cur));
    if (!deal || !participantAllowed(deal, userId, role, draft.campaigns)) {
      out = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    if (role !== 'brand') {
      out = { ok: false, status: 403, error: 'Only the brand can update payment status' };
      return;
    }
    try {
      assertPaymentStatusTransition(cur.status, nextStatus);
    } catch (e) {
      out = { ok: false, status: 400, error: e instanceof Error ? e.message : 'Invalid transition' };
      return;
    }
    const t = nowIso();
    const curN = normalizeStoredPayment({ ...cur } as StoredDealPayment);
    const next: StoredDealPayment = {
      ...curN,
      status: nextStatus,
      paidAt: nextStatus === 'paid' ? t : curN.paidAt,
      updatedAt: t,
    };
    draft.dealPayments[pidx] = next;
    pushActivity(draft, {
      dealId: deal._id,
      eventType: 'payment_status_changed',
      entityType: 'deal',
      entityId: deal._id,
      actorType: 'business',
      actorId: userId,
      metadata: { from: cur.status, to: nextStatus, paymentId },
      createdAt: t,
    });
    notifyDealPlaceholder('payment_status_changed', { dealId: deal._id, paymentId, nextStatus });

    const didx = draft.deals.findIndex((d) => idStr(d) === deal._id);
    if (didx >= 0) {
      let ds = draft.deals[didx].status;
      if (nextStatus === 'paid' && (ds === 'payment_pending' || ds === 'approved_completed')) {
        ds = 'paid';
        notifyDealPlaceholder('payment_paid', { dealId: deal._id, paymentId });
      } else if (
        (nextStatus === 'ready_to_release' || nextStatus === 'pending') &&
        (ds === 'approved_completed' || ds === 'paid')
      ) {
        if (ds !== 'paid') ds = 'payment_pending';
      }
      draft.deals[didx] = { ...draft.deals[didx], status: ds, updatedAt: t };
      if (ds === 'payment_pending') {
        notifyDealPlaceholder('payment_pending', { dealId: deal._id, paymentId, paymentStatus: nextStatus });
      }
    }

    refreshDealNextActionInDraft(draft, deal._id);
    const updatedDeal = getDeal(draft, deal._id) ?? undefined;
    out = { ok: true, payment: next, ...(updatedDeal ? { deal: updatedDeal } : {}) };
  });
  return out ?? { ok: false, status: 500, error: 'Unexpected error' };
}

/** System-triggered materialization: same as athlete acceptance but without athlete session (worker key). */
export async function systemMaterializeDealFromSentOffer(
  offerId: string
): Promise<FinalizeAcceptanceResult> {
  return finalizeOfferAcceptanceAndOpenDeal(offerId, { mode: 'system' });
}

export type DealNextAction = { nextActionOwner: DealNextActor | null; nextActionLabel: string };
