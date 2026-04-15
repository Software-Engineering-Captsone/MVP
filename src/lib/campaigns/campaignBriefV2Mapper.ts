/**
 * Phase 1: legacy campaign fields ↔ structured `campaignBriefV2`.
 * Pragmatic defaults — V2 wizard will replace/extend these shapes later.
 */

export const CAMPAIGN_BRIEF_V2_SCHEMA_VERSION = 'campaign_brief_v2' as const;

export type CampaignBriefV2SchemaVersion = typeof CAMPAIGN_BRIEF_V2_SCHEMA_VERSION;

export type ObjectiveTypeV2 = 'awareness' | 'consideration' | 'conversion' | 'ugc_library';
export type PrimaryKpiV2 =
  | 'reach'
  | 'engagement_rate'
  | 'ctr'
  | 'cpa'
  | 'leads'
  | 'sales';
export type AudienceGeoRequirementV2 = 'strict' | 'preferred' | 'open';
export type CtaTypeV2 = 'learn_more' | 'shop_now' | 'sign_up' | 'apply' | 'custom';
export type PaymentModelV2 = 'flat' | 'performance' | 'hybrid';
export type UsageRightsModeV2 = 'organic_only' | 'paid_usage';
export type VisibilityV2 = 'public' | 'invite_only' | 'private';
export type ShortlistStrategyV2 = 'manual' | 'assisted';

export type DeliverableSpecV2 = {
  platform: string;
  format: string;
  quantity: number;
  notes?: string;
};

export type CampaignBriefV2 = {
  schemaVersion: CampaignBriefV2SchemaVersion;
  strategy: {
    campaignName: string;
    objectiveType: ObjectiveTypeV2;
    primaryKpi: PrimaryKpiV2;
    primaryKpiTarget: number;
    flightStartDate: string;
    flightEndDate: string;
    marketRegion: string;
    secondaryKpi?: PrimaryKpiV2;
    secondaryKpiTarget?: number;
    campaignSummary?: string;
  };
  audienceCreatorFit: {
    audiencePersona: string;
    sportCategory: string;
    followerRangeMin: number;
    engagementRateMinPct: number;
    audienceGeoRequirement: AudienceGeoRequirementV2;
    subNiche?: string;
    genderFilter: string;
    languagePreferences?: string[];
    ageBand?: string;
    creatorExclusions?: string[];
  };
  contentDeliverables: {
    platforms: string[];
    deliverableBundle: DeliverableSpecV2[];
    ctaType: CtaTypeV2;
    messagePillars: string[];
    mustSay?: string[];
    mustAvoid?: string[];
    creativeAngle?: string;
    draftRequired?: boolean;
    revisionRounds?: number;
    publishCadence?: string;
  };
  budgetRights: {
    budgetCap: number;
    /** When both set (wizard / explicit API), publish validates min ≤ max. Omitted on legacy-derived briefs. */
    budgetRangeMin?: number;
    budgetRangeMax?: number;
    paymentModel: PaymentModelV2;
    usageRights: {
      mode: UsageRightsModeV2;
      durationDays: number;
      channels?: string[];
      whitelistingEnabled?: boolean;
    };
    targetCreatorCount?: number;
    exclusivityWindowDays?: number;
  };
  sourcingVisibility: {
    acceptApplications: boolean;
    visibility: VisibilityV2;
    shortlistStrategy: ShortlistStrategyV2;
    autoApproveRules?: unknown[];
    discoverySources?: string[];
    invitedCreatorIds?: string[];
  };
  reviewLaunch: {
    reviewConfirmed: boolean;
    lastReviewedAt?: string;
  };
  templateMeta?: {
    templateId?: string;
    templateVersion?: number;
    source: 'system' | 'org' | 'blank';
    lockOverrides?: string[];
  };
};

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((t) => String(t)).filter((s) => s.length > 0);
}

/** Normalize platform labels from legacy Title Case to V2 lowercase slugs. */
export function normalizePlatformSlug(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return 'other';
  if (s === 'x' || s === 'twitter') return 'x';
  if (s === 'ig' || s === 'instagram') return 'instagram';
  if (s === 'tiktok' || s === 'tik tok') return 'tiktok';
  if (s === 'youtube' || s === 'yt') return 'youtube';
  if (s === 'linkedin') return 'linkedin';
  return s.replace(/\s+/g, '_');
}

/** Map V2 slug back to legacy wizard display casing. */
function platformSlugToLegacyLabel(slug: string): string {
  const s = slug.trim().toLowerCase();
  const map: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    x: 'X',
    linkedin: 'LinkedIn',
    other: 'Other',
  };
  return map[s] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

function inferObjectiveFromGoal(goal: string): ObjectiveTypeV2 {
  const g = goal.toLowerCase();
  if (/ugc|library|asset|photo/i.test(g)) return 'ugc_library';
  if (/sale|revenue|purchase|roi|cpa/i.test(g)) return 'conversion';
  if (/click|traffic|visit|consider/i.test(g)) return 'consideration';
  if (/aware|reach|impression|brand/i.test(g)) return 'awareness';
  return 'awareness';
}

function inferGeoRequirement(location: string): AudienceGeoRequirementV2 {
  if (!location.trim()) return 'open';
  if (/strict|must be|only|required in/i.test(location.toLowerCase())) return 'strict';
  return 'preferred';
}

/** Best-effort: first plausible budget number from free-text ranges. */
export function parseBudgetCapHint(budget: string): number {
  if (!budget.trim()) return 0;
  const nums = budget.match(/[\d,]+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return 0;
  const parsed = nums.map((n) => Number(n.replace(/,/g, ''))).filter((n) => Number.isFinite(n) && n > 0);
  if (parsed.length === 0) return 0;
  return Math.max(...parsed);
}

/** Parse a single budget text field (min or max box); first positive number wins, 0 if none. */
export function parseBudgetSingleAmount(value: string): number {
  const s = String(value ?? '').trim();
  if (!s) return 0;
  const m = s.match(/[\d,]+(?:\.\d+)?/);
  if (!m) return 0;
  const n = Number(m[0].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatBudgetHintFromCap(cap: number): string {
  if (!cap || cap <= 0) return '';
  if (cap >= 1000) {
    const k = cap / 1000;
    const rounded = Math.round(k * 10) / 10;
    return `$${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
  }
  return `$${Math.round(cap)}`;
}

function deliverablesFromPackageDetails(details: string[], platforms: string[]): DeliverableSpecV2[] {
  const plat = platforms[0] ?? 'other';
  if (details.length === 0) {
    return [{ platform: plat, format: 'custom', quantity: 1, notes: 'See campaign brief' }];
  }
  return details.map((line) => ({
    platform: plat,
    format: 'custom',
    quantity: 1,
    notes: line,
  }));
}

function packageDetailsFromDeliverables(bundle: DeliverableSpecV2[]): string[] {
  return bundle
    .map((d) => {
      const q = d.quantity > 1 ? `${d.quantity}× ` : '';
      const fmt = d.format ? `${d.format} ` : '';
      const note = d.notes?.trim();
      return `${q}${fmt}${note ?? ''}`.trim();
    })
    .filter(Boolean);
}

function mergeBriefText(summary: string, pillars: string[], extra: string): string {
  const parts = [summary.trim(), pillars.length ? `Pillars: ${pillars.join(', ')}` : '', extra.trim()].filter(
    Boolean
  );
  return parts.join('\n\n').trim();
}

/** Human-readable campaign goal labels (legacy `goal` field + V2 objective picker). */
export const OBJECTIVE_TYPE_LABELS: Record<ObjectiveTypeV2, string> = {
  awareness: 'Brand awareness',
  consideration: 'Consideration and traffic',
  conversion: 'Conversions and sales',
  ugc_library: 'UGC and content library',
};

function pickIsoOrRawDate(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const ts = Date.parse(t);
  if (!Number.isNaN(ts)) return new Date(ts).toISOString().slice(0, 10);
  return t;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * PATCH helper: shallow-merge top-level sections, then per-section object merge
 * so omitted fields keep the stored campaign brief.
 */
export function mergeCampaignBriefV2Patch(existingBrief: unknown, patchBrief: unknown): CampaignBriefV2 {
  const ex = isRecord(existingBrief) ? existingBrief : {};
  const inc = isRecord(patchBrief) ? patchBrief : {};
  const merged: Record<string, unknown> = {
    ...ex,
    ...inc,
    strategy: { ...(isRecord(ex.strategy) ? ex.strategy : {}), ...(isRecord(inc.strategy) ? inc.strategy : {}) },
    audienceCreatorFit: {
      ...(isRecord(ex.audienceCreatorFit) ? ex.audienceCreatorFit : {}),
      ...(isRecord(inc.audienceCreatorFit) ? inc.audienceCreatorFit : {}),
    },
    contentDeliverables: {
      ...(isRecord(ex.contentDeliverables) ? ex.contentDeliverables : {}),
      ...(isRecord(inc.contentDeliverables) ? inc.contentDeliverables : {}),
    },
    budgetRights: {
      ...(isRecord(ex.budgetRights) ? ex.budgetRights : {}),
      ...(isRecord(inc.budgetRights) ? inc.budgetRights : {}),
      usageRights: {
        ...((isRecord(ex.budgetRights) && isRecord((ex.budgetRights as Record<string, unknown>).usageRights)
          ? (ex.budgetRights as Record<string, unknown>).usageRights
          : {}) as Record<string, unknown>),
        ...((isRecord(inc.budgetRights) && isRecord((inc.budgetRights as Record<string, unknown>).usageRights)
          ? (inc.budgetRights as Record<string, unknown>).usageRights
          : {}) as Record<string, unknown>),
      },
    },
    sourcingVisibility: {
      ...(isRecord(ex.sourcingVisibility) ? ex.sourcingVisibility : {}),
      ...(isRecord(inc.sourcingVisibility) ? inc.sourcingVisibility : {}),
    },
    reviewLaunch: {
      ...(isRecord(ex.reviewLaunch) ? ex.reviewLaunch : {}),
      ...(isRecord(inc.reviewLaunch) ? inc.reviewLaunch : {}),
    },
    templateMeta: inc.templateMeta !== undefined ? inc.templateMeta : ex.templateMeta,
  };
  return normalizeCampaignBriefV2(merged);
}

function defaultBriefV2Shell(): Omit<CampaignBriefV2, 'schemaVersion'> {
  return {
    strategy: {
      campaignName: '',
      objectiveType: 'awareness',
      primaryKpi: 'engagement_rate',
      primaryKpiTarget: 1,
      flightStartDate: '',
      flightEndDate: '',
      marketRegion: 'Global',
    },
    audienceCreatorFit: {
      audiencePersona: '',
      sportCategory: 'All Sports',
      followerRangeMin: 0,
      engagementRateMinPct: 0,
      audienceGeoRequirement: 'open',
      genderFilter: 'Any',
    },
    contentDeliverables: {
      platforms: [],
      deliverableBundle: [],
      ctaType: 'learn_more',
      messagePillars: [],
      draftRequired: true,
      revisionRounds: 1,
    },
    budgetRights: {
      budgetCap: 0,
      paymentModel: 'flat',
      usageRights: { mode: 'organic_only', durationDays: 90 },
    },
    sourcingVisibility: {
      acceptApplications: true,
      visibility: 'public',
      shortlistStrategy: 'manual',
    },
    reviewLaunch: { reviewConfirmed: false },
  };
}

/**
 * Deep-merge a client payload into the canonical V2 shape (missing sections default).
 */
export function normalizeCampaignBriefV2(raw: unknown): CampaignBriefV2 {
  const base = defaultBriefV2Shell();
  if (!isRecord(raw)) {
    return { schemaVersion: CAMPAIGN_BRIEF_V2_SCHEMA_VERSION, ...base };
  }

  const strategy = isRecord(raw.strategy) ? raw.strategy : {};
  const audience = isRecord(raw.audienceCreatorFit) ? raw.audienceCreatorFit : {};
  const content = isRecord(raw.contentDeliverables) ? raw.contentDeliverables : {};
  const budget = isRecord(raw.budgetRights) ? raw.budgetRights : {};
  const usage = isRecord(budget.usageRights) ? budget.usageRights : {};
  const sourcing = isRecord(raw.sourcingVisibility) ? raw.sourcingVisibility : {};
  const review = isRecord(raw.reviewLaunch) ? raw.reviewLaunch : {};
  const templateMeta = isRecord(raw.templateMeta) ? raw.templateMeta : undefined;

  const deliverableBundleRaw = content.deliverableBundle;
  const deliverableBundle = Array.isArray(deliverableBundleRaw)
    ? (deliverableBundleRaw as unknown[])
        .map((d) => {
          if (!isRecord(d)) return null;
          return {
            platform: asString(d.platform, 'other'),
            format: asString(d.format, 'custom'),
            quantity: Math.max(1, asNumber(d.quantity, 1)),
            notes: hasText(d.notes) ? String(d.notes).trim() : undefined,
          } as DeliverableSpecV2;
        })
        .filter((x): x is DeliverableSpecV2 => x != null)
    : base.contentDeliverables.deliverableBundle;

  return {
    schemaVersion: CAMPAIGN_BRIEF_V2_SCHEMA_VERSION,
    strategy: {
      ...base.strategy,
      campaignName: hasText(strategy.campaignName) ? String(strategy.campaignName).trim() : base.strategy.campaignName,
      objectiveType: (strategy.objectiveType as ObjectiveTypeV2) ?? base.strategy.objectiveType,
      primaryKpi: (strategy.primaryKpi as PrimaryKpiV2) ?? base.strategy.primaryKpi,
      primaryKpiTarget: asNumber(strategy.primaryKpiTarget, base.strategy.primaryKpiTarget),
      flightStartDate: asString(strategy.flightStartDate, base.strategy.flightStartDate),
      flightEndDate: asString(strategy.flightEndDate, base.strategy.flightEndDate),
      marketRegion: asString(strategy.marketRegion, base.strategy.marketRegion),
      secondaryKpi: strategy.secondaryKpi as PrimaryKpiV2 | undefined,
      secondaryKpiTarget:
        strategy.secondaryKpiTarget !== undefined
          ? asNumber(strategy.secondaryKpiTarget, 0)
          : undefined,
      campaignSummary: hasText(strategy.campaignSummary) ? String(strategy.campaignSummary).trim() : undefined,
    },
    audienceCreatorFit: {
      ...base.audienceCreatorFit,
      audiencePersona: asString(audience.audiencePersona, base.audienceCreatorFit.audiencePersona),
      sportCategory: asString(audience.sportCategory, base.audienceCreatorFit.sportCategory),
      followerRangeMin: asNumber(audience.followerRangeMin, base.audienceCreatorFit.followerRangeMin),
      engagementRateMinPct: asNumber(
        audience.engagementRateMinPct,
        base.audienceCreatorFit.engagementRateMinPct
      ),
      audienceGeoRequirement:
        (audience.audienceGeoRequirement as AudienceGeoRequirementV2) ??
        base.audienceCreatorFit.audienceGeoRequirement,
      subNiche: hasText(audience.subNiche) ? String(audience.subNiche).trim() : undefined,
      genderFilter: asString(audience.genderFilter, base.audienceCreatorFit.genderFilter),
      languagePreferences: asStringArray(audience.languagePreferences),
      ageBand: hasText(audience.ageBand) ? String(audience.ageBand) : undefined,
      creatorExclusions: asStringArray(audience.creatorExclusions),
    },
    contentDeliverables: {
      ...base.contentDeliverables,
      platforms:
        asStringArray(content.platforms).length > 0
          ? asStringArray(content.platforms).map((p) => normalizePlatformSlug(p))
          : base.contentDeliverables.platforms,
      deliverableBundle: deliverableBundle.length > 0 ? deliverableBundle : base.contentDeliverables.deliverableBundle,
      ctaType: (content.ctaType as CtaTypeV2) ?? base.contentDeliverables.ctaType,
      messagePillars:
        asStringArray(content.messagePillars).length > 0
          ? asStringArray(content.messagePillars)
          : base.contentDeliverables.messagePillars,
      mustSay: asStringArray(content.mustSay),
      mustAvoid: asStringArray(content.mustAvoid),
      creativeAngle: hasText(content.creativeAngle) ? String(content.creativeAngle) : undefined,
      draftRequired: content.draftRequired !== undefined ? asBool(content.draftRequired, true) : base.contentDeliverables.draftRequired,
      revisionRounds:
        content.revisionRounds !== undefined
          ? Math.max(0, asNumber(content.revisionRounds, 1))
          : base.contentDeliverables.revisionRounds,
      publishCadence: hasText(content.publishCadence) ? String(content.publishCadence) : undefined,
    },
    budgetRights: {
      ...base.budgetRights,
      budgetCap: asNumber(budget.budgetCap, base.budgetRights.budgetCap),
      ...(budget.budgetRangeMin !== undefined && budget.budgetRangeMax !== undefined
        ? (() => {
            const brMin = Math.max(0, asNumber(budget.budgetRangeMin, 0));
            const brMax = Math.max(0, asNumber(budget.budgetRangeMax, 0));
            return brMin > 0 && brMax > 0 ? { budgetRangeMin: brMin, budgetRangeMax: brMax } : {};
          })()
        : {}),
      paymentModel: (budget.paymentModel as PaymentModelV2) ?? base.budgetRights.paymentModel,
      usageRights: {
        mode: (usage.mode as UsageRightsModeV2) ?? base.budgetRights.usageRights.mode,
        durationDays: Math.max(1, asNumber(usage.durationDays, base.budgetRights.usageRights.durationDays)),
        channels: asStringArray(usage.channels),
        whitelistingEnabled:
          usage.whitelistingEnabled !== undefined ? asBool(usage.whitelistingEnabled, false) : undefined,
      },
      targetCreatorCount:
        budget.targetCreatorCount !== undefined
          ? asNumber(budget.targetCreatorCount, 0) || undefined
          : undefined,
      exclusivityWindowDays:
        budget.exclusivityWindowDays !== undefined
          ? Math.max(0, asNumber(budget.exclusivityWindowDays, 0))
          : undefined,
    },
    sourcingVisibility: {
      ...base.sourcingVisibility,
      acceptApplications:
        sourcing.acceptApplications !== undefined
          ? asBool(sourcing.acceptApplications, true)
          : base.sourcingVisibility.acceptApplications,
      visibility: (sourcing.visibility as VisibilityV2) ?? base.sourcingVisibility.visibility,
      shortlistStrategy:
        (sourcing.shortlistStrategy as ShortlistStrategyV2) ?? base.sourcingVisibility.shortlistStrategy,
      autoApproveRules: Array.isArray(sourcing.autoApproveRules) ? sourcing.autoApproveRules : undefined,
      discoverySources: asStringArray(sourcing.discoverySources),
      invitedCreatorIds: asStringArray(sourcing.invitedCreatorIds),
    },
    reviewLaunch: {
      reviewConfirmed:
        review.reviewConfirmed !== undefined
          ? asBool(review.reviewConfirmed, false)
          : base.reviewLaunch.reviewConfirmed,
      lastReviewedAt: hasText(review.lastReviewedAt) ? String(review.lastReviewedAt) : undefined,
    },
    templateMeta:
      templateMeta && hasText(templateMeta.source)
        ? {
            templateId: hasText(templateMeta.templateId) ? String(templateMeta.templateId) : undefined,
            templateVersion:
              templateMeta.templateVersion !== undefined
                ? asNumber(templateMeta.templateVersion, 0)
                : undefined,
            source: templateMeta.source as 'system' | 'org' | 'blank',
            lockOverrides: asStringArray(templateMeta.lockOverrides),
          }
        : undefined,
  };
}

/** Map structured V2 → legacy campaign fields (partial update / create payload). */
export function campaignBriefV2ToLegacy(briefV2: CampaignBriefV2): Record<string, unknown> {
  const { strategy, audienceCreatorFit, contentDeliverables, budgetRights, sourcingVisibility, reviewLaunch } =
    briefV2;

  const platformSlugs =
    contentDeliverables.platforms.length > 0 ? contentDeliverables.platforms : ['instagram'];
  const platforms = platformSlugs.map(platformSlugToLegacyLabel);
  const budgetStr =
    budgetRights.budgetCap > 0
      ? formatBudgetHintFromCap(budgetRights.budgetCap)
      : '';

  const visibilityLegacy =
    sourcingVisibility.visibility === 'private' || sourcingVisibility.visibility === 'invite_only'
      ? 'Private'
      : 'Public';

  const deliverableNotes = contentDeliverables.deliverableBundle
    .map((d) => d.notes)
    .filter((n): n is string => Boolean(n && n.trim()))
    .join('\n');

  const briefCombined = mergeBriefText(
    strategy.campaignSummary ?? '',
    contentDeliverables.messagePillars,
    [contentDeliverables.creativeAngle, deliverableNotes].filter(Boolean).join('\n')
  );

  /** Pinned server/org templates imply template workflow; otherwise keep client legacy `workflowPresetSource` (preset packages). */
  const workflowPresetSource: 'template' | 'scratch' | undefined =
    briefV2.templateMeta?.source === 'system' || briefV2.templateMeta?.source === 'org'
      ? 'template'
      : undefined;

  const rawFollower = audienceCreatorFit.followerRangeMin;
  const followerMinLegacy =
    !Number.isFinite(rawFollower) || rawFollower <= 0
      ? 0
      : rawFollower <= 100
        ? Math.round(rawFollower)
        : Math.min(100, Math.max(1, Math.round(rawFollower / 1000)));

  const legacy: Record<string, unknown> = {
    name: strategy.campaignName,
    goal: OBJECTIVE_TYPE_LABELS[strategy.objectiveType] ?? strategy.objectiveType,
    opportunityContext:
      strategy.campaignSummary?.trim() ||
      audienceCreatorFit.audiencePersona ||
      OBJECTIVE_TYPE_LABELS[strategy.objectiveType],
    brief: briefCombined || audienceCreatorFit.audiencePersona || strategy.campaignName,
    budget: budgetStr || (budgetRights.budgetCap > 0 ? String(budgetRights.budgetCap) : ''),
    budgetHint: budgetStr || (budgetRights.budgetCap > 0 ? String(budgetRights.budgetCap) : ''),
    startDate: strategy.flightStartDate,
    endDate: strategy.flightEndDate,
    location: strategy.marketRegion,
    sport: audienceCreatorFit.sportCategory,
    genderFilter: audienceCreatorFit.genderFilter || 'Any',
    followerMin: followerMinLegacy,
    engagementMinPct: audienceCreatorFit.engagementRateMinPct,
    brandFitTags: contentDeliverables.messagePillars,
    platforms,
    packageDetails: packageDetailsFromDeliverables(contentDeliverables.deliverableBundle),
    visibility: visibilityLegacy,
    acceptApplications: sourcingVisibility.acceptApplications,
    workflowPublishReviewConfirmed: reviewLaunch.reviewConfirmed,
  };
  if (workflowPresetSource !== undefined) {
    legacy.workflowPresetSource = workflowPresetSource;
  }
  return legacy;
}

/** Map legacy persisted campaign → V2 defaults (draft fidelity / backfill). */
export function legacyToCampaignBriefV2(legacy: Record<string, unknown>): CampaignBriefV2 {
  const name = asString(legacy.name, 'Untitled campaign');
  const goal = asString(legacy.goal, '');
  const brief = asString(legacy.brief, '');
  const opportunityContext = asString(legacy.opportunityContext, '');
  const location = asString(legacy.location, '');
  const start = asString(legacy.startDate, '');
  const end = asString(legacy.endDate, '');
  const sport = asString(legacy.sport, 'All Sports');
  const gender = asString(legacy.genderFilter, 'Any');
  const followerMin = asNumber(legacy.followerMin, 0);
  const engagementMinPct = asNumber(legacy.engagementMinPct, 0);
  const brandFitTags = asStringArray(legacy.brandFitTags);
  const packageDetails = asStringArray(legacy.packageDetails);
  const platformsRaw = asStringArray(legacy.platforms).map(normalizePlatformSlug);
  const budgetText = asString(legacy.budget, asString(legacy.budgetHint, ''));
  const cap = parseBudgetCapHint(budgetText);
  const acceptApplications = legacy.acceptApplications !== false;
  const vis = legacy.visibility === 'Private' ? 'private' : 'public';
  const reviewConfirmed = legacy.workflowPublishReviewConfirmed === true;

  const pillars = brandFitTags.length > 0 ? brandFitTags : brief ? [brief.slice(0, 80)] : ['Brand alignment'];

  return normalizeCampaignBriefV2({
    schemaVersion: CAMPAIGN_BRIEF_V2_SCHEMA_VERSION,
    strategy: {
      campaignName: name,
      objectiveType: inferObjectiveFromGoal(goal),
      primaryKpi: 'engagement_rate',
      primaryKpiTarget: engagementMinPct > 0 ? engagementMinPct : 1,
      flightStartDate: pickIsoOrRawDate(start),
      flightEndDate: pickIsoOrRawDate(end),
      marketRegion: location.trim() || 'Global',
      campaignSummary: opportunityContext || undefined,
    },
    audienceCreatorFit: {
      audiencePersona: opportunityContext || brief.slice(0, 400) || 'Creators aligned with campaign goals',
      sportCategory: sport,
      followerRangeMin: followerMin,
      engagementRateMinPct: engagementMinPct,
      audienceGeoRequirement: inferGeoRequirement(location),
      genderFilter: gender,
    },
    contentDeliverables: {
      platforms: platformsRaw.length > 0 ? platformsRaw : ['instagram'],
      deliverableBundle: deliverablesFromPackageDetails(packageDetails, platformsRaw),
      ctaType: 'learn_more',
      messagePillars: pillars,
      draftRequired: true,
      revisionRounds: 1,
    },
    budgetRights: {
      budgetCap: cap,
      paymentModel: 'flat',
      usageRights: { mode: 'organic_only', durationDays: 90 },
    },
    sourcingVisibility: {
      acceptApplications,
      visibility: vis as VisibilityV2,
      shortlistStrategy: 'manual',
    },
    reviewLaunch: { reviewConfirmed },
  });
}

/** Return persisted V2 brief only (no legacy backfill in dev-forward mode). */
export function resolveCampaignBriefV2ForApi(campaign: Record<string, unknown>): CampaignBriefV2 | null {
  const raw = campaign.campaignBriefV2;
  if (isRecord(raw)) {
    return normalizeCampaignBriefV2(raw);
  }
  return null;
}
