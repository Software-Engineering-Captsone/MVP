import { normalizeStructuredDraft, type OfferWizardState } from '../offerWizardTypes';
import type { DealTermsFrozenDeliverableSpec, DealTermsSnapshot, DeliverableType } from './types';

/** Offer-shaped input (Supabase row mapped to legacy field names, or JSON store) for building frozen terms. */
export type OfferTermsSource = Record<string, unknown> & { _id?: string };

function parseMoneyAmount(amountStr: string | undefined): number {
  if (!amountStr || !amountStr.trim()) return 0;
  const n = Number(amountStr.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normPlatform(p: string): string {
  return p.trim().toLowerCase();
}

function deliverableTypeFromPlatform(p: string): DeliverableType {
  const x = normPlatform(p);
  if (x.includes('tiktok')) return 'tiktok_video';
  if (x.includes('instagram') && x.includes('story')) return 'story';
  if (x.includes('instagram')) return 'instagram_post';
  return 'custom';
}

function appearanceDeliverableType(presetId: string): DeliverableType {
  if (presetId === 'appearance_media_day') return 'keynote';
  if (presetId === 'appearance_event') return 'appearance_event';
  return 'appearance_event';
}

function buildFrozenDeliverableSpecs(wizard: OfferWizardState): DealTermsFrozenDeliverableSpec[] {
  const basics = wizard.basics;
  const revisionLimit = Math.max(0, Math.floor(Number(wizard.contentControl.revisionRounds) || 0));
  const dueAt = basics.dueDate?.trim() ? basics.dueDate.trim() : null;
  const draftRequired = Boolean(wizard.contentControl.brandApprovalRequired);
  const publishRequired = basics.dealType === 'ugc' ? true : false;
  const proofRequired = basics.dealType === 'ugc';
  const disclosureRequired = basics.dealType === 'ugc';

  if (basics.dealType === 'appearance') {
    const title =
      wizard.appearance.eventOrSeriesName?.trim() ||
      basics.offerName?.trim() ||
      'Appearance deliverable';
    const instructions = [basics.details, wizard.appearance.wardrobeNotes, wizard.appearance.estimatedHours]
      .filter(Boolean)
      .join('\n\n');
    const type = appearanceDeliverableType(wizard.presetId);
    return [
      {
        title,
        type,
        instructions,
        dueAt,
        draftRequired,
        publishRequired: false,
        proofRequired: false,
        disclosureRequired: true,
        revisionLimit,
      },
    ];
  }

  const platforms =
    Array.isArray(wizard.ugc.primaryPlatforms) && wizard.ugc.primaryPlatforms.length
      ? wizard.ugc.primaryPlatforms
      : ['Instagram'];
  const rawCount = typeof wizard.ugc.assetCount === 'number' ? wizard.ugc.assetCount : 1;
  const n = Math.max(1, Math.min(12, Number.isFinite(rawCount) ? rawCount : 1));
  const baseTitle = basics.offerName?.trim() ? basics.offerName.trim() : 'Campaign deliverable';
  const instructions = [basics.details, wizard.ugc.hookOrTalkingPoints].filter(Boolean).join('\n\n');
  const out: DealTermsFrozenDeliverableSpec[] = [];
  for (let i = 0; i < n; i++) {
    const plat = platforms[i % platforms.length] ?? platforms[0] ?? 'Instagram';
    const type = deliverableTypeFromPlatform(String(plat));
    out.push({
      title: `${baseTitle} — asset ${i + 1} of ${n}`,
      type,
      instructions,
      dueAt,
      draftRequired,
      publishRequired,
      proofRequired,
      disclosureRequired,
      revisionLimit,
    });
  }
  return out;
}

/**
 * Builds an immutable snapshot from the offer row at acceptance time only.
 * Callers must not merge live offer fields after the deal exists.
 */
export function buildTermsSnapshotFromOffer(offer: OfferTermsSource): DealTermsSnapshot {
  const structuredDraftRaw =
    offer.structuredDraft != null && typeof offer.structuredDraft === 'object' && !Array.isArray(offer.structuredDraft)
      ? (JSON.parse(JSON.stringify(offer.structuredDraft)) as Record<string, unknown>)
      : undefined;
  const normalizedDraft = structuredDraftRaw ? normalizeStructuredDraft(structuredDraftRaw) : null;
  const structuredDraft = (normalizedDraft ?? structuredDraftRaw ?? null) as Record<string, unknown> | null;
  const wizard =
    structuredDraft && typeof structuredDraft.wizard === 'object' && structuredDraft.wizard != null
      ? (structuredDraft.wizard as OfferWizardState)
      : null;

  const notes = typeof offer.notes === 'string' ? offer.notes : '';
  const frozenDeliverables = wizard ? buildFrozenDeliverableSpecs(wizard) : [];

  const basics = wizard?.basics;
  const amountLabel = basics?.amount?.trim() ? basics.amount.trim() : '';
  const compensationSummary: Record<string, unknown> = {
    dealType: basics?.dealType ?? 'ugc',
    amountLabel: amountLabel || null,
    amount: wizard ? parseMoneyAmount(basics?.amount) : 0,
    currency: 'USD',
    organicUsageMonths: wizard?.ugc?.organicUsageMonths ?? null,
    paidAdsAllowed: wizard?.ugc?.paidAdsAllowed ?? null,
    appearanceFormat: wizard?.appearance?.appearanceFormat ?? null,
    travelIncluded: wizard?.appearance?.travelIncluded ?? null,
  };

  const revisionLimits = {
    maxRoundsPerDeliverable: Math.max(0, Math.floor(Number(wizard?.contentControl.revisionRounds) || 0)),
    responseWindowDays: wizard?.contentControl.responseWindowDays,
  };

  const deadlines = {
    offerDueDate: basics?.dueDate?.trim() ? basics.dueDate.trim() : null,
    responseWindowDays: wizard?.contentControl.responseWindowDays,
  };

  const instructions = [notes, basics?.details].filter(Boolean).join('\n\n') || notes;

  const contentRequirements: Record<string, unknown> = wizard
    ? {
        brandApprovalRequired: wizard.contentControl.brandApprovalRequired,
        hookOrTalkingPoints: wizard.ugc?.hookOrTalkingPoints ?? '',
        eventOrSeriesName: wizard.appearance?.eventOrSeriesName ?? '',
        wardrobeNotes: wizard.appearance?.wardrobeNotes ?? '',
      }
    : {};

  const disclosureRequirements: Record<string, unknown> = {
    required: basics?.dealType === 'ugc',
    scope: 'paid_partnership_disclosure_when_applicable',
  };

  const platformLocationRequirements: Record<string, unknown> = wizard
    ? basics?.dealType === 'ugc'
      ? {
          primaryPlatforms: wizard.ugc.primaryPlatforms ?? [],
        }
      : {
          appearanceFormat: wizard.appearance.appearanceFormat,
          travelIncluded: wizard.appearance.travelIncluded,
        }
    : {};

  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    offerId: String(offer._id ?? ''),
    brandUserId: String(offer.brandUserId ?? ''),
    athleteUserId: String(offer.athleteUserId ?? ''),
    offerOrigin: String(offer.offerOrigin ?? ''),
    campaignId: offer.campaignId != null ? String(offer.campaignId) : null,
    applicationId: offer.applicationId != null ? String(offer.applicationId) : null,
    notes,
    structuredDraft,
    frozen: {
      deliverables: frozenDeliverables,
      compensationSummary,
      revisionLimits,
      deadlines,
      instructions,
      contentRequirements,
      disclosureRequirements,
      platformLocationRequirements,
    },
  };
}

export function getFrozenDeliverableSpecs(snapshot: DealTermsSnapshot | Record<string, unknown>): DealTermsFrozenDeliverableSpec[] {
  if (snapshot && typeof snapshot === 'object' && 'frozen' in snapshot) {
    const f = (snapshot as DealTermsSnapshot).frozen;
    if (f?.deliverables && Array.isArray(f.deliverables) && f.deliverables.length) {
      return f.deliverables as DealTermsFrozenDeliverableSpec[];
    }
  }
  return [];
}
