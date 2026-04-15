/**
 * Stable demo rows for deal dashboards (local JSON store). Idempotent on stable `_id`s.
 * Uses `seed-brand-nilink-demo` and `seed-athlete-nilink-demo` with `SEED_CAMPAIGN_IDS` campaigns.
 */
import { mutateLocalUsersStore, readLocalUsersStore } from '@/lib/auth/localUserStore';
import { validateApplicationInput, validateOfferInput } from '@/lib/campaigns/validateCampaignRecords';
import type { StoredApplication, StoredOffer } from '@/lib/campaigns/localCampaignStore';
import type { LocalCampaignStoreSnapshot } from '@/lib/campaigns/localCampaignStore';
import { SEED_BRAND_USER_ID, SEED_CAMPAIGN_IDS } from '@/lib/campaigns/seedCampaigns';
import {
  OFFER_STRUCTURED_DRAFT_VERSION,
  applyPresetToWizard,
  emptyOfferWizardState,
} from '@/lib/campaigns/offerWizardTypes';
import { buildTermsSnapshotFromOffer } from '@/lib/campaigns/deals/termsSnapshot';
import { computeDealNextAction, refineNextActionWithDeliverables } from '@/lib/campaigns/deals/nextAction';
import type {
  DealTermsSnapshot,
  StoredDeal,
  StoredDealActivity,
  StoredDealContract,
  StoredDealPayment,
  StoredDeliverable,
  StoredSubmission,
} from '@/lib/campaigns/deals/types';

/** Synthetic athlete used for most handoff rows (also inserted into local users if missing). */
export const SEED_DEAL_GRAPH_ATHLETE_SYNTHETIC = 'seed-athlete-nilink-demo';

export const SEED_DEAL_GRAPH_IDS = [
  '64f0a1b2c3d4e5f6a7b8d101',
  '64f0a1b2c3d4e5f6a7b8d102',
  '64f0a1b2c3d4e5f6a7b8d103',
  '64f0a1b2c3d4e5f6a7b8d104',
  '64f0a1b2c3d4e5f6a7b8d105',
  '64f0a1b2c3d4e5f6a7b8d106',
] as const;

const SEED_APP_IDS = [
  '64f0a1b2c3d4e5f6a7b8e101',
  '64f0a1b2c3d4e5f6a7b8e102',
  '64f0a1b2c3d4e5f6a7b8e103',
  '64f0a1b2c3d4e5f6a7b8e104',
  '64f0a1b2c3d4e5f6a7b8e105',
] as const;

const SEED_OFFER_IDS = [
  '64f0a1b2c3d4e5f6a7b8f101',
  '64f0a1b2c3d4e5f6a7b8f102',
  '64f0a1b2c3d4e5f6a7b8f103',
  '64f0a1b2c3d4e5f6a7b8f104',
  '64f0a1b2c3d4e5f6a7b8f105',
  '64f0a1b2c3d4e5f6a7b8f106',
] as const;

const BASE_ISO = '2026-03-10T15:00:00.000Z';

function idStr(doc: { _id?: unknown }): string {
  if (doc._id == null) return '';
  return String(doc._id);
}

function buildUgcStructuredDraft(args: {
  offerName: string;
  amount: string;
  assetCount: number;
  platforms: string[];
  campaignId: string | null;
  applicationId: string | null;
  athleteUserId: string;
  offerOrigin: 'campaign_handoff' | 'direct_profile';
}): Record<string, unknown> {
  let w = emptyOfferWizardState();
  w = applyPresetToWizard(w, 'ugc_social_bundle');
  w.basics = {
    ...w.basics,
    offerName: args.offerName,
    dealType: 'ugc',
    dueDate: '2026-05-20',
    details: 'Seeded demo deliverable brief for dashboard previews.',
    amount: args.amount,
  };
  w.ugc = {
    ...w.ugc,
    primaryPlatforms: args.platforms.length ? args.platforms : ['Instagram'],
    assetCount: Math.max(1, Math.min(4, args.assetCount)),
    hookOrTalkingPoints: 'Highlight authentic product use and disclosure.',
    organicUsageMonths: 3,
    paidAdsAllowed: false,
  };
  w.contentControl = {
    brandApprovalRequired: true,
    revisionRounds: 2,
    responseWindowDays: 5,
  };
  return {
    version: OFFER_STRUCTURED_DRAFT_VERSION,
    wizard: w,
    originContext: {
      offerOrigin: args.offerOrigin,
      athleteUserId: args.athleteUserId,
      campaignId: args.campaignId,
      applicationId: args.applicationId,
      chatThreadId: null,
    },
  };
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
  const deal = draft.deals.find((d) => idStr(d) === dealId) ?? null;
  if (!deal) return;
  const contract = draft.dealContracts.find((c) => idStr(c) === deal.contractId) ?? null;
  const payment = draft.dealPayments.find((p) => idStr(p) === deal.paymentId) ?? null;
  const deliverables = draft.deliverables.filter((x) => x.dealId === dealId).sort((a, b) => a.order - b.order);
  const base = computeDealNextAction({ deal, contract, payment, deliverables });
  const refined = refineNextActionWithDeliverables(base, deal, deliverables);
  const idx = draft.deals.findIndex((d) => idStr(d) === dealId);
  if (idx < 0) return;
  draft.deals[idx] = {
    ...draft.deals[idx],
    nextActionOwner: refined.nextActionOwner,
    nextActionLabel: refined.nextActionLabel,
    updatedAt: deal.updatedAt,
  };
}

function campaignById(draft: LocalCampaignStoreSnapshot, campaignId: string) {
  return draft.campaigns.find((c) => idStr(c) === campaignId) ?? null;
}

export async function ensureSeedDealGraphUsersPresent(): Promise<void> {
  const snap = await readLocalUsersStore();
  if (snap.users.some((u) => u._id === SEED_DEAL_GRAPH_ATHLETE_SYNTHETIC)) return;
  await mutateLocalUsersStore((draft) => {
    if (draft.users.some((u) => u._id === SEED_DEAL_GRAPH_ATHLETE_SYNTHETIC)) return;
    draft.users.push({
      _id: SEED_DEAL_GRAPH_ATHLETE_SYNTHETIC,
      email: 'seed-athlete@nilink.local',
      password: null,
      role: 'athlete',
      name: 'NILink Demo Athlete',
      verified: true,
      createdAt: BASE_ISO,
    });
  });
}

function applicationPairFree(
  draft: LocalCampaignStoreSnapshot,
  campaignId: string,
  athleteUserId: string,
  stableAppId: string
): boolean {
  const existing = draft.applications.find(
    (a) => String(a.campaignId) === campaignId && String(a.athleteUserId) === athleteUserId
  );
  if (!existing) return true;
  return idStr(existing) === stableAppId;
}

function pushApprovedApplication(
  draft: LocalCampaignStoreSnapshot,
  row: {
    _id: string;
    campaignId: string;
    athleteUserId: string;
    athleteName: string;
  }
): boolean {
  if (!applicationPairFree(draft, row.campaignId, row.athleteUserId, row._id)) {
    return false;
  }
  if (draft.applications.some((a) => idStr(a) === row._id)) {
    return true;
  }
  const raw = validateApplicationInput({
    _id: row._id,
    campaignId: row.campaignId,
    athleteUserId: row.athleteUserId,
    status: 'approved',
    pitch: 'Seeded approved application for deal lifecycle demos.',
    athleteSnapshot: {
      name: row.athleteName,
      sport: 'All Sports',
      school: 'Demo University',
      image: '',
      followers: '12.4k',
      engagement: '3.2%',
    },
    messages: [],
    source: 'regular',
  });
  draft.applications.push({ ...raw, _id: row._id } as StoredApplication);
  return true;
}

function pushAcceptedOffer(
  draft: LocalCampaignStoreSnapshot,
  input: Record<string, unknown>
): StoredOffer | null {
  const cid =
    input.campaignId != null && String(input.campaignId).trim() !== ''
      ? String(input.campaignId)
      : '';
  const resolveCampaign = (id: string) => campaignById(draft, id);
  try {
    const raw = validateOfferInput(input, cid ? { campaignById: resolveCampaign } : undefined);
    const stable = String(input._id ?? '');
    return { ...raw, _id: stable || idStr(raw) } as StoredOffer;
  } catch (e) {
    console.error('[deals] Seed offer validation failed:', String(input._id ?? ''), e);
    return null;
  }
}

type Scenario = {
  dealId: string;
  offerId: string;
  /** Handoff only */
  applicationId?: string;
  campaignId: string | null;
  athleteUserId: string;
  athleteName: string;
  offerOrigin: 'campaign_handoff' | 'direct_profile';
  dealStatus: StoredDeal['status'];
  contract: Pick<StoredDealContract, 'status' | 'fileUrl' | 'signedAt'>;
  payment: Pick<StoredDealPayment, 'status' | 'amount' | 'paidAt'>;
  deliverables: Array<
    Pick<
      StoredDeliverable,
      | 'status'
      | 'title'
      | 'order'
      | 'type'
      | 'instructions'
      | 'draftRequired'
      | 'publishRequired'
      | 'proofRequired'
      | 'disclosureRequired'
      | 'revisionLimit'
      | 'revisionCountUsed'
    >
  >;
  submissions: Array<{
    _id: string;
    deliverableOrder: number;
    version: number;
    status: StoredSubmission['status'];
    notes: string;
  }>;
  activities: Array<Pick<StoredDealActivity, 'eventType' | 'entityType' | 'entityId' | 'actorType' | 'actorId' | 'metadata' | 'createdAt'>>;
  offerName: string;
  amount: string;
  assetCount: number;
  platforms: string[];
};

function buildScenarios(): Scenario[] {
  const synth = SEED_DEAL_GRAPH_ATHLETE_SYNTHETIC;
  const c = [...SEED_CAMPAIGN_IDS];
  return [
    {
      dealId: SEED_DEAL_GRAPH_IDS[0],
      offerId: SEED_OFFER_IDS[0],
      applicationId: SEED_APP_IDS[0],
      campaignId: c[0],
      athleteUserId: synth,
      athleteName: 'NILink Demo Athlete',
      offerOrigin: 'campaign_handoff',
      dealStatus: 'contract_pending',
      contract: { status: 'not_added', fileUrl: null, signedAt: null },
      payment: { status: 'not_configured', amount: 950, paidAt: null },
      deliverables: [
        {
          order: 0,
          title: 'Instagram Reel — product moment',
          type: 'instagram_post',
          instructions: '30–45s reel with on-screen disclosure.',
          status: 'not_started',
          draftRequired: true,
          publishRequired: true,
          proofRequired: true,
          disclosureRequired: true,
          revisionLimit: 2,
          revisionCountUsed: 0,
        },
      ],
      submissions: [],
      activities: [
        {
          eventType: 'deal_created',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[0],
          actorType: 'athlete',
          actorId: synth,
          metadata: { offerId: SEED_OFFER_IDS[0] },
          createdAt: '2026-03-10T15:01:00.000Z',
        },
      ],
      offerName: 'Spring Reel — handoff (contract)',
      amount: '$950',
      assetCount: 1,
      platforms: ['Instagram'],
    },
    {
      dealId: SEED_DEAL_GRAPH_IDS[1],
      offerId: SEED_OFFER_IDS[1],
      applicationId: SEED_APP_IDS[1],
      campaignId: c[1],
      athleteUserId: synth,
      athleteName: 'NILink Demo Athlete',
      offerOrigin: 'campaign_handoff',
      dealStatus: 'active',
      contract: { status: 'signed', fileUrl: 'https://example.com/seed-contract.pdf', signedAt: '2026-03-11T10:00:00.000Z' },
      payment: { status: 'pending', amount: 1200, paidAt: null },
      deliverables: [
        {
          order: 0,
          title: 'Hero edit + B-roll pull',
          type: 'custom',
          instructions: 'Deliver hero cut plus raw pulls for social cutdowns.',
          status: 'not_started',
          draftRequired: true,
          publishRequired: false,
          proofRequired: false,
          disclosureRequired: true,
          revisionLimit: 2,
          revisionCountUsed: 0,
        },
      ],
      submissions: [],
      activities: [
        {
          eventType: 'deal_created',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[1],
          actorType: 'system',
          actorId: null,
          metadata: { offerId: SEED_OFFER_IDS[1] },
          createdAt: '2026-03-09T12:00:00.000Z',
        },
        {
          eventType: 'contract_signed',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[1],
          actorType: 'athlete',
          actorId: synth,
          metadata: {},
          createdAt: '2026-03-11T10:00:00.000Z',
        },
      ],
      offerName: 'Commercial bundle — active',
      amount: '$1,200',
      assetCount: 1,
      platforms: ['Instagram', 'YouTube'],
    },
    {
      dealId: SEED_DEAL_GRAPH_IDS[2],
      offerId: SEED_OFFER_IDS[2],
      applicationId: SEED_APP_IDS[2],
      campaignId: c[2],
      athleteUserId: synth,
      athleteName: 'NILink Demo Athlete',
      offerOrigin: 'campaign_handoff',
      dealStatus: 'under_review',
      contract: { status: 'signed', fileUrl: 'https://example.com/seed-contract-3.pdf', signedAt: '2026-03-08T14:00:00.000Z' },
      payment: { status: 'awaiting_setup', amount: 1500, paidAt: null },
      deliverables: [
        {
          order: 0,
          title: 'Weekly campus story set',
          type: 'story',
          instructions: 'Batch of stories highlighting ambassador moments.',
          status: 'under_review',
          draftRequired: true,
          publishRequired: true,
          proofRequired: true,
          disclosureRequired: true,
          revisionLimit: 2,
          revisionCountUsed: 0,
        },
      ],
      submissions: [
        {
          _id: '64f0a1b2c3d4e5f6a7b8a401',
          deliverableOrder: 0,
          version: 1,
          status: 'submitted',
          notes: 'First draft for brand review (seed).',
        },
      ],
      activities: [
        {
          eventType: 'deal_created',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[2],
          actorType: 'athlete',
          actorId: synth,
          metadata: { offerId: SEED_OFFER_IDS[2] },
          createdAt: '2026-03-07T09:00:00.000Z',
        },
        {
          eventType: 'contract_signed',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[2],
          actorType: 'athlete',
          actorId: synth,
          metadata: {},
          createdAt: '2026-03-08T14:00:00.000Z',
        },
        {
          eventType: 'submission_submitted',
          entityType: 'submission',
          entityId: '64f0a1b2c3d4e5f6a7b8a401',
          actorType: 'athlete',
          actorId: synth,
          metadata: { deliverableId: '__DELIVERABLE_0__', submissionId: '64f0a1b2c3d4e5f6a7b8a401' },
          createdAt: '2026-03-12T16:30:00.000Z',
        },
      ],
      offerName: 'Ambassador weekly content',
      amount: '$1,500',
      assetCount: 1,
      platforms: ['Instagram', 'TikTok'],
    },
    {
      dealId: SEED_DEAL_GRAPH_IDS[3],
      offerId: SEED_OFFER_IDS[3],
      applicationId: SEED_APP_IDS[3],
      campaignId: c[3],
      athleteUserId: synth,
      athleteName: 'NILink Demo Athlete',
      offerOrigin: 'campaign_handoff',
      dealStatus: 'revision_requested',
      contract: { status: 'signed', fileUrl: 'https://example.com/seed-contract-4.pdf', signedAt: '2026-03-05T11:00:00.000Z' },
      payment: { status: 'pending', amount: 1800, paidAt: null },
      deliverables: [
        {
          order: 0,
          title: 'Game-day carousel',
          type: 'instagram_post',
          instructions: 'Carousel + cover; revise per brand notes.',
          status: 'revision_requested',
          draftRequired: true,
          publishRequired: true,
          proofRequired: true,
          disclosureRequired: true,
          revisionLimit: 2,
          revisionCountUsed: 1,
        },
      ],
      submissions: [
        {
          _id: '64f0a1b2c3d4e5f6a7b8a402',
          deliverableOrder: 0,
          version: 1,
          status: 'revision_requested',
          notes: 'Initial draft (seed).',
        },
      ],
      activities: [
        {
          eventType: 'deal_created',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[3],
          actorType: 'athlete',
          actorId: synth,
          metadata: { offerId: SEED_OFFER_IDS[3] },
          createdAt: '2026-03-04T13:00:00.000Z',
        },
        {
          eventType: 'revision_requested',
          entityType: 'submission',
          entityId: '64f0a1b2c3d4e5f6a7b8a402',
          actorType: 'business',
          actorId: SEED_BRAND_USER_ID,
          metadata: { submissionId: '64f0a1b2c3d4e5f6a7b8a402', feedback: 'Tighten CTA frame 1' },
          createdAt: '2026-03-13T18:00:00.000Z',
        },
      ],
      offerName: 'Game-day carousel pack',
      amount: '$1,800',
      assetCount: 1,
      platforms: ['Instagram'],
    },
    {
      dealId: SEED_DEAL_GRAPH_IDS[4],
      offerId: SEED_OFFER_IDS[4],
      applicationId: SEED_APP_IDS[4],
      campaignId: c[4],
      athleteUserId: synth,
      athleteName: 'NILink Demo Athlete',
      offerOrigin: 'campaign_handoff',
      dealStatus: 'payment_pending',
      contract: { status: 'signed', fileUrl: 'https://example.com/seed-contract-5.pdf', signedAt: '2026-03-01T10:00:00.000Z' },
      payment: { status: 'ready_to_release', amount: 1100, paidAt: null },
      deliverables: [
        {
          order: 0,
          title: 'Training week story arc',
          type: 'story',
          instructions: 'Stories across one training week with product tags.',
          status: 'completed',
          draftRequired: true,
          publishRequired: false,
          proofRequired: true,
          disclosureRequired: true,
          revisionLimit: 2,
          revisionCountUsed: 0,
        },
      ],
      submissions: [
        {
          _id: '64f0a1b2c3d4e5f6a7b8a403',
          deliverableOrder: 0,
          version: 1,
          status: 'approved',
          notes: 'Approved as final (seed).',
        },
      ],
      activities: [
        {
          eventType: 'deal_created',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[4],
          actorType: 'system',
          actorId: null,
          metadata: { offerId: SEED_OFFER_IDS[4] },
          createdAt: '2026-02-28T09:00:00.000Z',
        },
        {
          eventType: 'deal_completed',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[4],
          actorType: 'business',
          actorId: SEED_BRAND_USER_ID,
          metadata: { phase: 'all_deliverables_completed' },
          createdAt: '2026-03-14T12:00:00.000Z',
        },
        {
          eventType: 'payment_pending',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[4],
          actorType: 'system',
          actorId: null,
          metadata: {},
          createdAt: '2026-03-14T12:01:00.000Z',
        },
      ],
      offerName: 'Training week bundle',
      amount: '$1,100',
      assetCount: 1,
      platforms: ['Instagram', 'TikTok'],
    },
    {
      dealId: SEED_DEAL_GRAPH_IDS[5],
      offerId: SEED_OFFER_IDS[5],
      campaignId: null,
      athleteUserId: synth,
      athleteName: 'NILink Demo Athlete',
      offerOrigin: 'direct_profile',
      dealStatus: 'closed',
      contract: { status: 'signed', fileUrl: 'https://example.com/seed-contract-6.pdf', signedAt: '2026-02-20T10:00:00.000Z' },
      payment: { status: 'paid', amount: 750, paidAt: '2026-03-02T17:00:00.000Z' },
      deliverables: [
        {
          order: 0,
          title: 'Profile-origin UGC clip',
          type: 'tiktok_video',
          instructions: 'Short TikTok with disclosure and product mention.',
          status: 'completed',
          draftRequired: true,
          publishRequired: false,
          proofRequired: true,
          disclosureRequired: true,
          revisionLimit: 2,
          revisionCountUsed: 0,
        },
      ],
      submissions: [
        {
          _id: '64f0a1b2c3d4e5f6a7b8a404',
          deliverableOrder: 0,
          version: 1,
          status: 'approved',
          notes: 'Posted + verified (seed).',
        },
      ],
      activities: [
        {
          eventType: 'deal_created',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[5],
          actorType: 'athlete',
          actorId: synth,
          metadata: { offerId: SEED_OFFER_IDS[5] },
          createdAt: '2026-02-19T11:00:00.000Z',
        },
        {
          eventType: 'payment_paid',
          entityType: 'deal',
          entityId: SEED_DEAL_GRAPH_IDS[5],
          actorType: 'system',
          actorId: null,
          metadata: {},
          createdAt: '2026-03-02T17:00:00.000Z',
        },
      ],
      offerName: 'Direct profile clip',
      amount: '$750',
      assetCount: 1,
      platforms: ['TikTok'],
    },
  ];
}

function materializeScenario(draft: LocalCampaignStoreSnapshot, sc: Scenario): void {
  const contractId = `${sc.dealId}c`;
  const paymentId = `${sc.dealId}p`;

  if (sc.offerOrigin === 'campaign_handoff' && sc.campaignId && sc.applicationId) {
    const okApp = pushApprovedApplication(draft, {
      _id: sc.applicationId,
      campaignId: sc.campaignId,
      athleteUserId: sc.athleteUserId,
      athleteName: sc.athleteName,
    });
    if (!okApp) {
      return;
    }
  }

  const structuredDraft = buildUgcStructuredDraft({
    offerName: sc.offerName,
    amount: sc.amount,
    assetCount: sc.assetCount,
    platforms: sc.platforms,
    campaignId: sc.campaignId,
    applicationId: sc.applicationId ?? null,
    athleteUserId: sc.athleteUserId,
    offerOrigin: sc.offerOrigin,
  });

  const offerPayload: Record<string, unknown> = {
    _id: sc.offerId,
    brandUserId: SEED_BRAND_USER_ID,
    athleteUserId: sc.athleteUserId,
    offerOrigin: sc.offerOrigin,
    status: 'accepted',
    dealId: sc.dealId,
    acceptedAt: new Date('2026-03-10T14:00:00.000Z'),
    notes: `Seed offer for lifecycle demo (${sc.dealStatus}).`,
    structuredDraft,
    ...(sc.campaignId ? { campaignId: sc.campaignId } : {}),
    ...(sc.applicationId ? { applicationId: sc.applicationId } : {}),
  };

  const offerRow = pushAcceptedOffer(draft, offerPayload);
  if (!offerRow) {
    return;
  }
  if (!draft.offers.some((o) => idStr(o) === sc.offerId)) {
    draft.offers.push(offerRow);
  } else {
    const oi = draft.offers.findIndex((o) => idStr(o) === sc.offerId);
    if (oi >= 0) draft.offers[oi] = offerRow;
  }

  const termsSnapshot = buildTermsSnapshotFromOffer(offerRow) as DealTermsSnapshot;
  termsSnapshot.capturedAt = BASE_ISO;

  const t = BASE_ISO;
  const contract: StoredDealContract = {
    _id: contractId,
    dealId: sc.dealId,
    status: sc.contract.status,
    fileUrl: sc.contract.fileUrl,
    signedAt: sc.contract.signedAt,
    createdAt: t,
    updatedAt: t,
  };
  const payment: StoredDealPayment = {
    _id: paymentId,
    dealId: sc.dealId,
    amount: sc.payment.amount,
    currency: 'USD',
    status: sc.payment.status,
    provider: 'placeholder',
    providerReference: `seed-${sc.dealId.slice(-4)}`,
    releaseCondition: 'all_deliverables_completed',
    paidAt: sc.payment.paidAt,
    createdAt: t,
    updatedAt: t,
  };

  draft.dealContracts.push(contract);
  draft.dealPayments.push(payment);

  const deliverableIds: string[] = [];
  for (let i = 0; i < sc.deliverables.length; i++) {
    const spec = sc.deliverables[i]!;
    const did = `${sc.dealId}d${i}`;
    deliverableIds.push(did);
    const row: StoredDeliverable = {
      _id: did,
      dealId: sc.dealId,
      title: spec.title,
      order: spec.order,
      type: spec.type,
      instructions: spec.instructions,
      status: spec.status,
      dueAt: '2026-05-01',
      draftRequired: spec.draftRequired,
      publishRequired: spec.publishRequired,
      proofRequired: spec.proofRequired,
      disclosureRequired: spec.disclosureRequired,
      revisionLimit: spec.revisionLimit,
      revisionCountUsed: spec.revisionCountUsed,
      createdAt: t,
      updatedAt: t,
    };
    draft.deliverables.push(row);
  }

  for (const sub of sc.submissions) {
    const delId = deliverableIds[sub.deliverableOrder] ?? deliverableIds[0]!;
    const row: StoredSubmission = {
      _id: sub._id,
      deliverableId: delId,
      dealId: sc.dealId,
      version: sub.version,
      submittedBy: sc.athleteUserId,
      submittedAt: '2026-03-12T16:00:00.000Z',
      submissionType: 'text',
      artifacts: [{ kind: 'text', text: sub.notes }],
      notes: sub.notes,
      status: sub.status,
      reviewedBy: sub.status === 'submitted' ? null : SEED_BRAND_USER_ID,
      reviewedAt: sub.status === 'submitted' ? null : '2026-03-13T10:00:00.000Z',
      feedback: sub.status === 'revision_requested' ? 'Tighten hook in first 3s' : null,
      createdAt: t,
      updatedAt: t,
    };
    draft.submissions.push(row);
  }

  const deal: StoredDeal = {
    _id: sc.dealId,
    offerId: sc.offerId,
    brandUserId: SEED_BRAND_USER_ID,
    athleteUserId: sc.athleteUserId,
    campaignId: sc.campaignId,
    applicationId: sc.applicationId ?? null,
    chatThreadId: null,
    termsSnapshot,
    status: sc.dealStatus,
    contractId,
    paymentId,
    nextActionOwner: 'brand',
    nextActionLabel: '…',
    createdAt: t,
    updatedAt: t,
  };
  draft.deals.push(deal);

  sc.activities.forEach((a, actIdx) => {
    let entityId = a.entityId;
    if (entityId === '__DELIVERABLE_0__' && deliverableIds[0]) {
      entityId = deliverableIds[0]!;
    }
    const meta: Record<string, unknown> = { ...(a.metadata ?? {}) };
    if (meta.deliverableId === '__DELIVERABLE_0__' && deliverableIds[0]) {
      meta.deliverableId = deliverableIds[0]!;
    }
    draft.dealActivities.push({
      _id: `${sc.dealId}a${actIdx}`,
      dealId: sc.dealId,
      entityType: a.entityType,
      entityId,
      actorType: a.actorType,
      actorId: a.actorId,
      eventType: a.eventType,
      metadata: meta,
      createdAt: a.createdAt ?? t,
    });
  });

  refreshDealNextActionInDraft(draft, sc.dealId);
}

export function applySeedDealLifecycleGraph(draft: LocalCampaignStoreSnapshot): void {
  if (!Array.isArray(draft.deals)) draft.deals = [];
  if (!Array.isArray(draft.deliverables)) draft.deliverables = [];
  if (!Array.isArray(draft.submissions)) draft.submissions = [];
  if (!Array.isArray(draft.dealContracts)) draft.dealContracts = [];
  if (!Array.isArray(draft.dealPayments)) draft.dealPayments = [];
  if (!Array.isArray(draft.dealActivities)) draft.dealActivities = [];
  if (!Array.isArray(draft.offers)) draft.offers = [];
  if (!Array.isArray(draft.applications)) draft.applications = [];

  const scenarios = buildScenarios();

  for (const sc of scenarios) {
    if (draft.deals.some((d) => idStr(d) === sc.dealId)) {
      continue;
    }
    try {
      materializeScenario(draft, sc);
    } catch (e) {
      console.error('[deals] Seed scenario skipped:', sc.dealId, e);
    }
  }
}
