/**
 * Helpers for campaign creation wizard V2: hydrate UI from `CampaignBriefV2`
 * and build a canonical brief from explicit wizard state.
 */

import {
  CAMPAIGN_BRIEF_V2_SCHEMA_VERSION,
  OBJECTIVE_TYPE_LABELS,
  type AudienceGeoRequirementV2,
  type CampaignBriefV2,
  type CtaTypeV2,
  type DeliverableSpecV2,
  type ObjectiveTypeV2,
  type PaymentModelV2,
  type PrimaryKpiV2,
  type ShortlistStrategyV2,
  type UsageRightsModeV2,
  type VisibilityV2,
  normalizeCampaignBriefV2,
  normalizePlatformSlug,
  parseBudgetCapHint,
  parseBudgetSingleAmount,
} from './campaignBriefV2Mapper';

export type CampaignTemplateListItem = {
  id: string;
  name: string;
  description?: string;
  version: number;
  orgId?: string;
  defaults: CampaignBriefV2;
};

/** Map persisted follower min (slider 0–100 as “K” shorthand or raw count) to UI slider 0–100. */
export function followerSliderFromBriefFollowerRange(followerRangeMin: number): number {
  if (!Number.isFinite(followerRangeMin) || followerRangeMin <= 0) return 0;
  if (followerRangeMin <= 100) return Math.min(100, Math.round(followerRangeMin));
  return Math.min(100, Math.round(followerRangeMin / 1000));
}

export function legacyGoalToObjectiveType(goal: string): ObjectiveTypeV2 {
  const g = goal.trim();
  for (const [key, label] of Object.entries(OBJECTIVE_TYPE_LABELS) as [ObjectiveTypeV2, string][]) {
    if (label === g) return key;
  }
  const lower = g.toLowerCase();
  if (/ugc|library|asset/i.test(lower)) return 'ugc_library';
  if (/sale|lead|foot|conversion/i.test(lower)) return 'conversion';
  if (/engagement|traffic|consider/i.test(lower)) return 'consideration';
  return 'awareness';
}

export function visibilityV2ToLegacyPublicPrivate(v: VisibilityV2): 'Public' | 'Private' {
  if (v === 'private' || v === 'invite_only') return 'Private';
  return 'Public';
}

export function legacyPublicPrivateToVisibilityV2(v: 'Public' | 'Private'): VisibilityV2 {
  return v === 'Private' ? 'private' : 'public';
}

export type WizardV2TemplateSelection = {
  templateId?: string;
  templateVersion?: number;
  source: 'system' | 'org' | 'blank';
};

export type HydrateOverlayFromBriefResult = {
  campaignName: string;
  opportunityContext: string;
  goal: string;
  brief: string;
  startDate: string;
  endDate: string;
  sport: string;
  gender: string;
  followerMin: number;
  engagementMinPct: number;
  brandFitTags: string[];
  acceptApplications: boolean;
  visibility: 'Public' | 'Private';
  locationRadius: string;
  budgetMin: string;
  budgetMax: string;
  reviewPublishConfirmed: boolean;
  objectiveType: ObjectiveTypeV2;
  primaryKpi: PrimaryKpiV2;
  primaryKpiTarget: number;
  secondaryKpi: PrimaryKpiV2 | '';
  secondaryKpiTarget: string;
  marketRegion: string;
  audiencePersona: string;
  audienceGeoRequirement: AudienceGeoRequirementV2;
  languagePreferencesText: string;
  creatorExclusionsText: string;
  platforms: string[];
  deliverableBundle: DeliverableSpecV2[];
  ctaType: CtaTypeV2;
  messagePillars: string[];
  mustSayLines: string;
  mustAvoidLines: string;
  draftRequired: boolean;
  revisionRounds: number;
  paymentModel: PaymentModelV2;
  usageRightsMode: UsageRightsModeV2;
  usageDurationDays: number;
  shortlistStrategy: ShortlistStrategyV2;
  visibilityV2: VisibilityV2;
  templateSelection: WizardV2TemplateSelection;
};

function isoDateToDateInput(iso: string): string {
  const t = iso.trim();
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const ts = Date.parse(t);
  if (Number.isNaN(ts)) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function splitLines(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeWizardGender(genderFilter: string | undefined): string {
  const g = (genderFilter ?? '').trim();
  if (g === 'Any' || g === 'Male' || g === 'Female') return g;
  if (/^men$/i.test(g)) return 'Male';
  if (/^women$/i.test(g)) return 'Female';
  if (/^male$/i.test(g)) return 'Male';
  if (/^female$/i.test(g)) return 'Female';
  return 'Any';
}

export function hydrateOverlayFromCampaignBriefV2(brief: CampaignBriefV2): HydrateOverlayFromBriefResult {
  const s = brief.strategy;
  const a = brief.audienceCreatorFit;
  const c = brief.contentDeliverables;
  const b = brief.budgetRights;
  const u = b.usageRights;
  const src = brief.sourcingVisibility;
  const r = brief.reviewLaunch;
  const meta = brief.templateMeta;

  const cap = b.budgetCap > 0 ? String(Math.round(b.budgetCap)) : '';
  const rangeMin = b.budgetRangeMin;
  const rangeMax = b.budgetRangeMax;
  const hasStoredRange =
    typeof rangeMin === 'number' &&
    typeof rangeMax === 'number' &&
    !Number.isNaN(rangeMin) &&
    !Number.isNaN(rangeMax) &&
    rangeMin > 0 &&
    rangeMax > 0;
  const goal = OBJECTIVE_TYPE_LABELS[s.objectiveType] ?? OBJECTIVE_TYPE_LABELS.awareness;

  const pillars = [...(c.messagePillars ?? [])];
  const brandFitTags = pillars.filter((p) =>
    ['Values-aligned', 'School spirit', 'Professional tone', 'Family-friendly', 'Performance-focused'].includes(p)
  );

  return {
    campaignName: s.campaignName ?? '',
    opportunityContext: s.campaignSummary?.trim() || a.audiencePersona || '',
    goal,
    brief: (c.creativeAngle ?? '').trim() || splitLines((c.mustSay ?? []).join('\n')).join('\n') || pillars[0] || '',
    startDate: isoDateToDateInput(s.flightStartDate),
    endDate: isoDateToDateInput(s.flightEndDate),
    sport: a.sportCategory || 'All Sports',
    gender: normalizeWizardGender(a.genderFilter),
    followerMin: followerSliderFromBriefFollowerRange(a.followerRangeMin),
    engagementMinPct: a.engagementRateMinPct ?? 0,
    brandFitTags: brandFitTags.length > 0 ? brandFitTags : [],
    acceptApplications: src.acceptApplications !== false,
    visibility: visibilityV2ToLegacyPublicPrivate(src.visibility),
    locationRadius: s.marketRegion?.trim() && s.marketRegion !== 'Global' ? s.marketRegion : '',
    budgetMin: hasStoredRange ? String(Math.round(rangeMin)) : cap,
    budgetMax: hasStoredRange ? String(Math.round(rangeMax)) : cap,
    reviewPublishConfirmed: r.reviewConfirmed === true,
    objectiveType: s.objectiveType,
    primaryKpi: s.primaryKpi,
    primaryKpiTarget: s.primaryKpiTarget,
    secondaryKpi: s.secondaryKpi ?? '',
    secondaryKpiTarget:
      s.secondaryKpiTarget !== undefined && s.secondaryKpiTarget !== null ? String(s.secondaryKpiTarget) : '',
    marketRegion: s.marketRegion || 'Global',
    audiencePersona: a.audiencePersona || '',
    audienceGeoRequirement: a.audienceGeoRequirement ?? 'open',
    languagePreferencesText: (a.languagePreferences ?? []).join(', '),
    creatorExclusionsText: (a.creatorExclusions ?? []).join('\n'),
    platforms: (c.platforms ?? []).map((p) => normalizePlatformSlug(String(p))),
    deliverableBundle: [...(c.deliverableBundle ?? [])],
    ctaType: c.ctaType,
    messagePillars: pillars.length > 0 ? pillars : [...brandFitTags],
    mustSayLines: (c.mustSay ?? []).join('\n'),
    mustAvoidLines: (c.mustAvoid ?? []).join('\n'),
    draftRequired: c.draftRequired !== false,
    revisionRounds: c.revisionRounds ?? 1,
    paymentModel: b.paymentModel,
    usageRightsMode: u.mode,
    usageDurationDays: u.durationDays ?? 90,
    shortlistStrategy: src.shortlistStrategy ?? 'manual',
    visibilityV2: src.visibility ?? 'public',
    templateSelection: {
      templateId: meta?.templateId,
      templateVersion: meta?.templateVersion,
      source: meta?.source ?? 'blank',
    },
  };
}

export type BuildCampaignBriefV2FromWizardArgs = {
  campaignName: string;
  opportunityContext: string;
  brief: string;
  goal: string;
  startDate: string;
  endDate: string;
  sport: string;
  gender: string;
  followerMin: number;
  engagementMinPct: number;
  brandFitTags: string[];
  acceptApplications: boolean;
  visibility: 'Public' | 'Private';
  locationRadius: string;
  budgetMin: string;
  budgetMax: string;
  reviewPublishConfirmed: boolean;
  objectiveType: ObjectiveTypeV2;
  primaryKpi: PrimaryKpiV2;
  primaryKpiTarget: number;
  secondaryKpi: PrimaryKpiV2 | '';
  secondaryKpiTarget: string;
  marketRegion: string;
  audiencePersona: string;
  audienceGeoRequirement: AudienceGeoRequirementV2;
  languagePreferencesText: string;
  creatorExclusionsText: string;
  platforms: string[];
  deliverableBundle: DeliverableSpecV2[];
  ctaType: CtaTypeV2;
  messagePillars: string[];
  mustSayLines: string;
  mustAvoidLines: string;
  draftRequired: boolean;
  revisionRounds: number;
  paymentModel: PaymentModelV2;
  usageRightsMode: UsageRightsModeV2;
  usageDurationDays: number;
  shortlistStrategy: ShortlistStrategyV2;
  visibilityV2: VisibilityV2;
  templateSelection: WizardV2TemplateSelection;
};

export function buildCampaignBriefV2FromWizardState(args: BuildCampaignBriefV2FromWizardArgs): CampaignBriefV2 {
  const safeTrim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  const budgetStr = args.budgetMin || args.budgetMax ? `$${args.budgetMin || '0'} – $${args.budgetMax || '0'}` : '';
  const capFromRange = Math.max(parseBudgetCapHint(budgetStr), parseBudgetCapHint(args.budgetMax), parseBudgetCapHint(args.budgetMin));
  const minAmt = parseBudgetSingleAmount(args.budgetMin);
  const maxAmt = parseBudgetSingleAmount(args.budgetMax);
  const budgetRangeEndpoints =
    minAmt > 0 && maxAmt > 0 ? ({ budgetRangeMin: minAmt, budgetRangeMax: maxAmt } as const) : {};

  const pillars =
    args.messagePillars.length > 0
      ? [...args.messagePillars]
      : args.brandFitTags.length > 0
        ? [...args.brandFitTags]
        : [];

  /** Slider 1–100 means “K” minimum followers; persist as approximate raw count for V2. */
  const followerRangeMin =
    args.followerMin <= 0 ? 0 : args.followerMin <= 100 ? args.followerMin * 1000 : Math.round(args.followerMin);

  const market = safeTrim(args.marketRegion) || safeTrim(args.locationRadius) || 'Global';

  const secKpi = args.secondaryKpi && String(args.secondaryKpi).trim() ? (args.secondaryKpi as PrimaryKpiV2) : undefined;
  const secT = safeTrim(args.secondaryKpiTarget);
  const secTarget = secKpi && secT ? Number(secT) : undefined;

  const langs = (args.languagePreferencesText ?? '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const exclusions = splitLines(args.creatorExclusionsText ?? '');

  const bundle =
    args.deliverableBundle.length > 0
      ? args.deliverableBundle
      : pillars.length > 0
        ? [{ platform: args.platforms[0] ?? 'instagram', format: 'custom', quantity: 1, notes: pillars[0] }]
        : [];

  const raw: Record<string, unknown> = {
    schemaVersion: CAMPAIGN_BRIEF_V2_SCHEMA_VERSION,
    strategy: {
      campaignName: safeTrim(args.campaignName),
      objectiveType: args.objectiveType,
      primaryKpi: args.primaryKpi,
      primaryKpiTarget: args.primaryKpiTarget,
      flightStartDate: safeTrim(args.startDate),
      flightEndDate: safeTrim(args.endDate),
      marketRegion: market,
      secondaryKpi: secKpi,
      secondaryKpiTarget: secTarget !== undefined && Number.isFinite(secTarget) ? secTarget : undefined,
      campaignSummary: safeTrim(args.opportunityContext) || undefined,
    },
    audienceCreatorFit: {
      audiencePersona: safeTrim(args.audiencePersona) || safeTrim(args.opportunityContext) || safeTrim(args.campaignName),
      sportCategory: args.sport,
      followerRangeMin,
      engagementRateMinPct: args.engagementMinPct,
      audienceGeoRequirement: args.audienceGeoRequirement ?? 'open',
      genderFilter: args.gender,
      languagePreferences: langs.length ? langs : undefined,
      creatorExclusions: exclusions.length ? exclusions : undefined,
    },
    contentDeliverables: {
      platforms: args.platforms.length > 0 ? args.platforms.map((p) => normalizePlatformSlug(p)) : ['instagram'],
      deliverableBundle: bundle,
      ctaType: args.ctaType,
      messagePillars: pillars.length > 0 ? pillars : ['Brand alignment'],
      mustSay: splitLines(args.mustSayLines),
      mustAvoid: splitLines(args.mustAvoidLines),
      creativeAngle: safeTrim(args.brief) || undefined,
      draftRequired: args.draftRequired,
      revisionRounds: Math.max(0, Math.round(args.revisionRounds)),
    },
    budgetRights: {
      budgetCap: capFromRange,
      ...budgetRangeEndpoints,
      paymentModel: args.paymentModel,
      usageRights: {
        mode: args.usageRightsMode,
        durationDays: Math.max(1, Math.round(args.usageDurationDays)),
      },
    },
    sourcingVisibility: {
      acceptApplications: args.acceptApplications,
      visibility: args.visibilityV2,
      shortlistStrategy: args.shortlistStrategy,
    },
    reviewLaunch: {
      reviewConfirmed: args.reviewPublishConfirmed,
    },
    templateMeta: {
      templateId: args.templateSelection.templateId,
      templateVersion: args.templateSelection.templateVersion,
      source: args.templateSelection.source,
    },
  };

  return normalizeCampaignBriefV2(raw);
}
