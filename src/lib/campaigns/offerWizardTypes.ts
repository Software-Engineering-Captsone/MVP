/**
 * Phase 4 offer wizard — persisted under `Offer.structuredDraft` (offer-owned only).
 * Versioned for forward-compatible reads.
 */

export const OFFER_STRUCTURED_DRAFT_VERSION = 1 as const;

export type OfferDealType = 'ugc' | 'appearance';

export type OfferWizardPresetId =
  | 'scratch'
  | 'ugc_social_bundle'
  | 'ugc_photo_set'
  | 'appearance_event'
  | 'appearance_media_day';

export type OfferWizardBasics = {
  offerName: string;
  dealType: OfferDealType;
  dueDate: string;
  details: string;
  /** Optional compensation hint; binding deal economics may layer on later. */
  amount?: string;
};

export type OfferWizardUgcSection = {
  primaryPlatforms: string[];
  assetCount: number;
  hookOrTalkingPoints: string;
  organicUsageMonths: number;
  paidAdsAllowed: boolean;
};

export type OfferWizardAppearanceSection = {
  eventOrSeriesName: string;
  appearanceFormat: 'in_person' | 'virtual' | 'hybrid';
  estimatedHours: string;
  travelIncluded: 'included' | 'reimbursed' | 'not_covered';
  wardrobeNotes: string;
};

export type OfferWizardContentControl = {
  brandApprovalRequired: boolean;
  revisionRounds: number;
  responseWindowDays: number;
};

export type OfferWizardSourcing = {
  categoryExclusivity: 'none' | 'soft' | 'hard';
  competitorExclusions: string;
  negotiationStyle: 'standard' | 'flexible' | 'take_it_or_leave_it';
  allowCounterTerms: boolean;
};

export type OfferWizardState = {
  presetId: OfferWizardPresetId | '';
  basics: OfferWizardBasics;
  ugc: OfferWizardUgcSection;
  appearance: OfferWizardAppearanceSection;
  contentControl: OfferWizardContentControl;
  sourcing: OfferWizardSourcing;
  /** Wizard navigation only; submission flag lives in meta. */
  lastVisitedStep: number;
};

export type OfferStructuredDraftMeta = {
  submittedAt?: string;
  submitted?: boolean;
};

export type OfferStructuredDraft = {
  version: typeof OFFER_STRUCTURED_DRAFT_VERSION;
  wizard: OfferWizardState;
  meta?: OfferStructuredDraftMeta;
  /** Denormalized snapshot after review submit (optional until submitted). */
  assembled?: Record<string, unknown>;
  /** Origin-specific linkage copied at draft time (read models for UI; not campaign writes). */
  originContext?: {
    offerOrigin: 'campaign_handoff' | 'direct_profile' | 'chat_negotiated';
    campaignId?: string | null;
    applicationId?: string | null;
    athleteUserId: string;
    chatThreadId?: string | null;
  };
};

export function emptyOfferWizardState(): OfferWizardState {
  return {
    presetId: '',
    basics: {
      offerName: '',
      dealType: 'ugc',
      dueDate: '',
      details: '',
      amount: '',
    },
    ugc: {
      primaryPlatforms: [],
      assetCount: 1,
      hookOrTalkingPoints: '',
      organicUsageMonths: 3,
      paidAdsAllowed: false,
    },
    appearance: {
      eventOrSeriesName: '',
      appearanceFormat: 'in_person',
      estimatedHours: '',
      travelIncluded: 'reimbursed',
      wardrobeNotes: '',
    },
    contentControl: {
      brandApprovalRequired: true,
      revisionRounds: 2,
      responseWindowDays: 5,
    },
    sourcing: {
      categoryExclusivity: 'none',
      competitorExclusions: '',
      negotiationStyle: 'standard',
      allowCounterTerms: true,
    },
    lastVisitedStep: 0,
  };
}

export function normalizeStructuredDraft(raw: unknown): OfferStructuredDraft | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== OFFER_STRUCTURED_DRAFT_VERSION || o.wizard == null || typeof o.wizard !== 'object') {
    return null;
  }
  return raw as OfferStructuredDraft;
}

export function applyPresetToWizard(
  state: OfferWizardState,
  presetId: OfferWizardPresetId
): OfferWizardState {
  const next = { ...state, presetId };
  switch (presetId) {
    case 'ugc_social_bundle':
      return {
        ...next,
        basics: { ...next.basics, dealType: 'ugc', offerName: next.basics.offerName || 'Social UGC bundle' },
        ugc: {
          ...next.ugc,
          primaryPlatforms: next.ugc.primaryPlatforms.length ? next.ugc.primaryPlatforms : ['Instagram', 'TikTok'],
          assetCount: Math.max(next.ugc.assetCount, 3),
        },
      };
    case 'ugc_photo_set':
      return {
        ...next,
        basics: { ...next.basics, dealType: 'ugc', offerName: next.basics.offerName || 'Photo UGC set' },
        ugc: {
          ...next.ugc,
          primaryPlatforms: next.ugc.primaryPlatforms.length ? next.ugc.primaryPlatforms : ['Instagram'],
          assetCount: Math.max(next.ugc.assetCount, 5),
        },
      };
    case 'appearance_event':
      return {
        ...next,
        basics: {
          ...next.basics,
          dealType: 'appearance',
          offerName: next.basics.offerName || 'Event appearance',
        },
        appearance: {
          ...next.appearance,
          appearanceFormat: 'in_person',
        },
      };
    case 'appearance_media_day':
      return {
        ...next,
        basics: {
          ...next.basics,
          dealType: 'appearance',
          offerName: next.basics.offerName || 'Media day appearance',
        },
        appearance: {
          ...next.appearance,
          appearanceFormat: 'hybrid',
        },
      };
    default:
      return { ...next, presetId: presetId === 'scratch' ? '' : presetId };
  }
}

export type CampaignHandoffPrefillArgs = {
  campaignName: string;
  campaignBrief: string;
  athleteName: string;
};

export type DirectProfilePrefillArgs = {
  athleteName: string;
};

export type ChatNegotiatedPrefillArgs = {
  chatThreadId?: string | null;
  athleteName?: string;
};

/** Merge read-only handoff context into wizard defaults (does not touch campaign storage). */
export function prefillWizardFromCampaignHandoff(
  base: OfferWizardState,
  args: CampaignHandoffPrefillArgs
): OfferWizardState {
  const snippet =
    args.campaignBrief.length > 280 ? `${args.campaignBrief.slice(0, 280)}…` : args.campaignBrief;
  return {
    ...base,
    basics: {
      ...base.basics,
      offerName: base.basics.offerName || `${args.campaignName} — ${args.athleteName}`,
      details:
        base.basics.details ||
        `Campaign context (read-only): ${args.campaignName}\n\nBrief excerpt:\n${snippet || '—'}`,
    },
  };
}

export function prefillWizardFromDirectProfile(
  base: OfferWizardState,
  args: DirectProfilePrefillArgs
): OfferWizardState {
  return {
    ...base,
    basics: {
      ...base.basics,
      offerName: base.basics.offerName || `Partnership — ${args.athleteName}`,
      details: base.basics.details || 'Direct outreach from brand profile discovery.',
    },
  };
}

export function prefillWizardFromChatNegotiated(
  base: OfferWizardState,
  args: ChatNegotiatedPrefillArgs
): OfferWizardState {
  const thread = args.chatThreadId ? `Linked chat thread: ${args.chatThreadId}` : 'Chat-negotiated (placeholder lane).';
  const name = args.athleteName ? `${args.athleteName} — chat offer` : 'Chat-negotiated offer';
  return {
    ...base,
    basics: {
      ...base.basics,
      offerName: base.basics.offerName || name,
      details: base.basics.details || thread,
    },
  };
}

export function buildAssembledOfferOutput(args: {
  offerId: string;
  offerOrigin: 'campaign_handoff' | 'direct_profile' | 'chat_negotiated';
  campaignId: string | null;
  applicationId: string | null;
  athleteUserId: string;
  brandUserId: string;
  structuredDraft: OfferStructuredDraft;
}): Record<string, unknown> {
  const { wizard, meta, originContext } = args.structuredDraft;
  return {
    id: args.offerId,
    offerOrigin: args.offerOrigin,
    campaignId: args.campaignId,
    applicationId: args.applicationId,
    athleteUserId: args.athleteUserId,
    brandUserId: args.brandUserId,
    status: 'draft',
    structuredDraftVersion: args.structuredDraft.version,
    dealSummary: {
      name: wizard.basics.offerName,
      dealType: wizard.basics.dealType,
      dueDate: wizard.basics.dueDate,
      amount: wizard.basics.amount || null,
      submitted: Boolean(meta?.submitted),
      submittedAt: meta?.submittedAt ?? null,
    },
    typeSpecific: wizard.basics.dealType === 'ugc' ? { ugc: wizard.ugc } : { appearance: wizard.appearance },
    contentControl: wizard.contentControl,
    sourcing: wizard.sourcing,
    originContext: originContext ?? {
      offerOrigin: args.offerOrigin,
      campaignId: args.campaignId,
      applicationId: args.applicationId,
      athleteUserId: args.athleteUserId,
    },
  };
}
