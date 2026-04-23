/**
 * Publish-time validation for campaigns (7 workflow sections + V2 section mapping).
 * Draft saves skip this module; only `intent: publish` paths invoke it.
 */

import {
  CAMPAIGN_BRIEF_V2_SCHEMA_VERSION,
  type CampaignBriefV2,
} from './campaignBriefV2Mapper';

type CampaignPublishInput = Record<string, unknown>;

export type CampaignPublishStepKey =
  | 'presets'
  | 'basics'
  | 'audience_social'
  | 'brand_fit'
  | 'sourcing'
  | 'location'
  | 'review';

/** V2 wizard sections (aligned with `CampaignBriefV2`). */
export type CampaignBriefV2SectionKey =
  | 'strategy'
  | 'audienceCreatorFit'
  | 'contentDeliverables'
  | 'budgetRights'
  | 'sourcingVisibility'
  | 'reviewLaunch';

export type CampaignPublishValidationIssue = {
  step: CampaignPublishStepKey;
  message: string;
  v2Section?: CampaignBriefV2SectionKey;
  code?: string;
};

/** Defaults are static; merge partial overrides for future org/admin resolution. */
export type CampaignPublishPolicy = {
  treatLowConfidenceAsBlocking: boolean;
  treatWideAudienceAsBlocking: boolean;
};

export const DEFAULT_CAMPAIGN_PUBLISH_POLICY: Readonly<CampaignPublishPolicy> = {
  treatLowConfidenceAsBlocking: false,
  treatWideAudienceAsBlocking: false,
};

export type CampaignPublishValidationResult = {
  blockingIssues: CampaignPublishValidationIssue[];
  warningIssues: CampaignPublishValidationIssue[];
  /** Derived from blocking issues per V2 section (warnings do not mark a section incomplete). */
  completenessBySection: Partial<Record<CampaignBriefV2SectionKey, boolean>>;
};

export type ValidateCampaignPublishOptions = {
  policy?: Partial<CampaignPublishPolicy>;
  /**
   * When true (default), emit policy-driven quality warnings alongside blocking checks.
   * When false, mandatory matrix / wizard blocking issues only (warnings omitted).
   */
  enablePolicyWarnings?: boolean;
};

/** Merge defaults with overrides — future org/admin resolution can call this with stored policy. */
export function resolveCampaignPublishPolicy(
  partial?: Partial<CampaignPublishPolicy>
): CampaignPublishPolicy {
  return { ...DEFAULT_CAMPAIGN_PUBLISH_POLICY, ...partial };
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((t) => String(t)).filter((s) => s.length > 0);
}

function isUsefulBudget(budget: unknown): boolean {
  if (!hasText(budget)) return false;
  const s = String(budget).trim();
  if (/^\$\s*0\s*[–-]\s*\$\s*0$/i.test(s) || /^\$\s*0\s*[–-]\s*0$/i.test(s)) return false;
  return true;
}

function getBriefV2(input: CampaignPublishInput): CampaignBriefV2 | null {
  const v = input.campaignBriefV2;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if ((v as { schemaVersion?: string }).schemaVersion !== CAMPAIGN_BRIEF_V2_SCHEMA_VERSION) {
    return null;
  }
  return v as CampaignBriefV2;
}

function inferV2SectionFromStep(step: CampaignPublishStepKey): CampaignBriefV2SectionKey {
  switch (step) {
    case 'presets':
      return 'contentDeliverables';
    case 'basics':
      return 'strategy';
    case 'audience_social':
    case 'brand_fit':
    case 'location':
      return 'audienceCreatorFit';
    case 'sourcing':
      return 'sourcingVisibility';
    case 'review':
      return 'reviewLaunch';
    default:
      return 'strategy';
  }
}

function issueSection(i: CampaignPublishValidationIssue): CampaignBriefV2SectionKey {
  return i.v2Section ?? inferV2SectionFromStep(i.step);
}

function buildCompletenessBySection(
  blockingIssues: CampaignPublishValidationIssue[]
): Partial<Record<CampaignBriefV2SectionKey, boolean>> {
  const keys: CampaignBriefV2SectionKey[] = [
    'strategy',
    'audienceCreatorFit',
    'contentDeliverables',
    'budgetRights',
    'sourcingVisibility',
    'reviewLaunch',
  ];
  const out: Partial<Record<CampaignBriefV2SectionKey, boolean>> = {};
  for (const k of keys) {
    out[k] = !blockingIssues.some((i) => issueSection(i) === k);
  }
  return out;
}

/** Pinned org/system campaign template satisfies the preset gate without a legacy package row. */
function v2PinnedTemplateComplete(input: CampaignPublishInput): boolean {
  const brief = getBriefV2(input);
  const m = brief?.templateMeta;
  if (!m || (m.source !== 'system' && m.source !== 'org')) return false;
  return typeof m.templateId === 'string' && m.templateId.trim().length > 0;
}

/** Template path: package identity present. Scratch path: explicit marker from client. */
function presetStepComplete(input: CampaignPublishInput): boolean {
  if (v2PinnedTemplateComplete(input)) return true;
  const src = input.workflowPresetSource;
  if (src === 'scratch') return true;
  if (src === 'template') {
    return hasText(input.packageId) || hasText(input.packageName);
  }
  if (hasText(input.packageId) || hasText(input.packageName)) return true;
  if (hasText(input.campaignType) && !hasText(input.packageId) && !hasText(input.packageName)) {
    return true;
  }
  return false;
}

function validatePresets(input: CampaignPublishInput, issues: CampaignPublishValidationIssue[]) {
  if (!presetStepComplete(input)) {
    issues.push({
      step: 'presets',
      v2Section: 'contentDeliverables',
      message:
        'Choose a preset package, or continue with a custom campaign (scratch path) before publishing.',
    });
    return;
  }
  const src = input.workflowPresetSource;
  if (
    src === 'template' &&
    !hasText(input.packageId) &&
    !hasText(input.packageName) &&
    !v2PinnedTemplateComplete(input)
  ) {
    issues.push({
      step: 'presets',
      v2Section: 'contentDeliverables',
      message: 'Template campaigns must include a package id or package name.',
    });
  }
}

function validateBasics(input: CampaignPublishInput, issues: CampaignPublishValidationIssue[]) {
  if (!hasText(input.name)) {
    issues.push({
      step: 'basics',
      v2Section: 'strategy',
      message: 'Campaign name is required for publish.',
    });
  }
  if (!hasText(input.goal)) {
    issues.push({
      step: 'basics',
      v2Section: 'strategy',
      message: 'Opportunity goal is required for publish.',
    });
  }
  if (!hasText(input.opportunityContext)) {
    issues.push({
      step: 'basics',
      v2Section: 'strategy',
      message: 'Opportunity details (context) are required for publish.',
    });
  }
  if (!hasText(input.brief)) {
    issues.push({
      step: 'basics',
      v2Section: 'strategy',
      message: 'Campaign brief is required for publish.',
    });
  }
  if (!isUsefulBudget(input.budget)) {
    issues.push({
      step: 'basics',
      v2Section: 'budgetRights',
      message: 'A meaningful budget range is required for publish.',
    });
  }
  if (!hasText(input.startDate) || !hasText(input.endDate)) {
    issues.push({
      step: 'basics',
      v2Section: 'budgetRights',
      message: 'Opportunity duration (start and end dates) is required for publish.',
    });
  }

  const start = String(input.startDate ?? '');
  const end = String(input.endDate ?? '');
  if (start && end) {
    const startTs = Date.parse(start);
    const endTs = Date.parse(end);
    if (!Number.isNaN(startTs) && !Number.isNaN(endTs) && endTs < startTs) {
      issues.push({
        step: 'basics',
        v2Section: 'budgetRights',
        message: 'End date must be after start date.',
      });
    }
  }
}

function validateAudienceSocial(input: CampaignPublishInput, issues: CampaignPublishValidationIssue[]) {
  if (!hasText(input.sport)) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Sport / category filter is required for publish.',
    });
  }
  if (!hasText(input.genderFilter)) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Audience identity filter is required for publish.',
    });
  }
  const followerMin = input.followerMin;
  if (typeof followerMin !== 'number' || Number.isNaN(followerMin) || followerMin < 0) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Follower minimum must be a valid number (0 or greater) for publish.',
    });
  }
  const engagementMinPct = input.engagementMinPct;
  if (typeof engagementMinPct !== 'number' || Number.isNaN(engagementMinPct)) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Engagement floor must be a valid percentage for publish.',
    });
  } else if (engagementMinPct < 0 || engagementMinPct > 100) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Engagement floor must be between 0 and 100.',
    });
  }
}

function validateBrandFit(input: CampaignPublishInput, issues: CampaignPublishValidationIssue[]) {
  const tags = asStringArray(input.brandFitTags);
  const brief = getBriefV2(input);
  const pillars = brief?.contentDeliverables?.messagePillars ?? [];
  const pillarText = Array.isArray(pillars) ? pillars.map((t) => String(t)).filter((s) => s.trim().length > 0) : [];
  if (tags.length === 0 && pillarText.length === 0) {
    issues.push({
      step: 'brand_fit',
      v2Section: 'audienceCreatorFit',
      message: 'Select at least one brand-fit tag or add message pillars before publishing.',
    });
  }
}

function validateSourcing(input: CampaignPublishInput, issues: CampaignPublishValidationIssue[]) {
  if (input.visibility !== 'Public' && input.visibility !== 'Private') {
    issues.push({
      step: 'sourcing',
      v2Section: 'sourcingVisibility',
      message: 'Visibility must be Public or Private before publish.',
    });
  }
  if (typeof input.acceptApplications !== 'boolean') {
    issues.push({
      step: 'sourcing',
      v2Section: 'sourcingVisibility',
      message: 'Application acceptance (open/closed) must be set before publish.',
    });
  }
}

function validateLocation(input: CampaignPublishInput, issues: CampaignPublishValidationIssue[]) {
  const brief = getBriefV2(input);
  const region = brief?.strategy?.marketRegion;
  if (typeof region === 'string' && region.trim().length > 0) return;
  if (!hasText(input.location)) {
    issues.push({
      step: 'location',
      v2Section: 'audienceCreatorFit',
      message: 'Location or geographic focus is required for publish.',
    });
  }
}

function validateReview(input: CampaignPublishInput, issues: CampaignPublishValidationIssue[]) {
  if (input.workflowPublishReviewConfirmed !== true) {
    issues.push({
      step: 'review',
      v2Section: 'reviewLaunch',
      message: 'Confirm the review step (workflowPublishReviewConfirmed) before publishing.',
    });
  }
}

/** Pinned org/system templates satisfy presets; otherwise reuse legacy preset / scratch rules. */
function v2WizardPresetComplete(input: CampaignPublishInput, brief: CampaignBriefV2): boolean {
  const meta = brief.templateMeta;
  if (meta?.source === 'system' || meta?.source === 'org') {
    return hasText(meta.templateId);
  }
  return presetStepComplete(input);
}

function collectV2WizardBlockingIssues(
  input: CampaignPublishInput,
  brief: CampaignBriefV2
): CampaignPublishValidationIssue[] {
  const issues: CampaignPublishValidationIssue[] = [];

  if (!v2WizardPresetComplete(input, brief)) {
    issues.push({
      step: 'presets',
      v2Section: 'contentDeliverables',
      message:
        'Pick a campaign template (pinned), choose a preset package, or mark a custom scratch campaign before publishing.',
    });
  }

  const s = brief.strategy;
  const a = brief.audienceCreatorFit;
  const c = brief.contentDeliverables;
  const b = brief.budgetRights;
  const src = brief.sourcingVisibility;
  const rv = brief.reviewLaunch;

  if (!hasText(s.campaignName)) {
    issues.push({
      step: 'basics',
      v2Section: 'strategy',
      message: 'Campaign name is required for publish.',
    });
  }
  if (!hasText(s.objectiveType)) {
    issues.push({
      step: 'basics',
      v2Section: 'strategy',
      message: 'Campaign objective is required for publish.',
    });
  }
  if (!hasText(s.flightStartDate) || !hasText(s.flightEndDate)) {
    issues.push({
      step: 'basics',
      v2Section: 'strategy',
      message: 'Flight start and end dates are required for publish.',
    });
  } else {
    const st = Date.parse(String(s.flightStartDate));
    const en = Date.parse(String(s.flightEndDate));
    if (!Number.isNaN(st) && !Number.isNaN(en) && en < st) {
      issues.push({
        step: 'basics',
        v2Section: 'strategy',
        message: 'End date must be after start date.',
      });
    }
  }
  if (typeof s.primaryKpiTarget !== 'number' || Number.isNaN(s.primaryKpiTarget) || s.primaryKpiTarget <= 0) {
    issues.push({
      step: 'basics',
      v2Section: 'strategy',
      message: 'Primary KPI target must be greater than zero.',
    });
  }
  if (!hasText(s.marketRegion)) {
    issues.push({
      step: 'location',
      v2Section: 'strategy',
      message: 'Market / region is required for publish.',
    });
  }

  if (!hasText(a.sportCategory)) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Sport / category is required for publish.',
    });
  }
  if (!hasText(a.audiencePersona)) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Audience persona is required for publish.',
    });
  }
  if (!hasText(a.genderFilter)) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Audience identity filter is required for publish.',
    });
  }
  const followerMin = a.followerRangeMin;
  if (typeof followerMin !== 'number' || Number.isNaN(followerMin) || followerMin < 0) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Follower minimum must be a valid number (0 or greater) for publish.',
    });
  }
  const engagementMinPct = a.engagementRateMinPct;
  if (typeof engagementMinPct !== 'number' || Number.isNaN(engagementMinPct)) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Engagement floor must be a valid percentage for publish.',
    });
  } else if (engagementMinPct < 0 || engagementMinPct > 100) {
    issues.push({
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      message: 'Engagement floor must be between 0 and 100.',
    });
  }

  const pillars = c.messagePillars ?? [];
  const tags = asStringArray(input.brandFitTags);
  if (pillars.length === 0 && tags.length === 0) {
    issues.push({
      step: 'brand_fit',
      v2Section: 'contentDeliverables',
      message: 'Add at least one message pillar or brand-fit tag before publishing.',
    });
  }

  if (!Array.isArray(c.platforms) || c.platforms.length === 0) {
    issues.push({
      step: 'presets',
      v2Section: 'contentDeliverables',
      message: 'Select at least one content platform.',
    });
  }
  if (!Array.isArray(c.deliverableBundle) || c.deliverableBundle.length === 0) {
    issues.push({
      step: 'presets',
      v2Section: 'contentDeliverables',
      message: 'Define at least one deliverable in the bundle.',
    });
  }

  const brMin = b.budgetRangeMin;
  const brMax = b.budgetRangeMax;
  if (
    typeof brMin === 'number' &&
    typeof brMax === 'number' &&
    !Number.isNaN(brMin) &&
    !Number.isNaN(brMax) &&
    brMin > 0 &&
    brMax > 0 &&
    brMin > brMax
  ) {
    issues.push({
      step: 'basics',
      v2Section: 'budgetRights',
      code: 'budget_range_inverted',
      message: 'Budget minimum cannot be greater than budget maximum.',
    });
  }
  if (!(typeof b.budgetCap === 'number' && !Number.isNaN(b.budgetCap) && b.budgetCap > 0)) {
    issues.push({
      step: 'basics',
      v2Section: 'budgetRights',
      message: 'A meaningful budget cap is required for publish.',
    });
  }
  if (!hasText(b.paymentModel)) {
    issues.push({
      step: 'basics',
      v2Section: 'budgetRights',
      message: 'Payment model is required for publish.',
    });
  }
  if (!hasText(b.usageRights?.mode)) {
    issues.push({
      step: 'basics',
      v2Section: 'budgetRights',
      message: 'Usage rights mode is required for publish.',
    });
  }
  if (
    typeof b.usageRights?.durationDays !== 'number' ||
    Number.isNaN(b.usageRights.durationDays) ||
    b.usageRights.durationDays <= 0
  ) {
    issues.push({
      step: 'basics',
      v2Section: 'budgetRights',
      message: 'Usage rights duration must be greater than zero.',
    });
  }

  if (!hasText(src.visibility)) {
    issues.push({
      step: 'sourcing',
      v2Section: 'sourcingVisibility',
      message: 'Visibility must be set before publish.',
    });
  }
  if (typeof src.acceptApplications !== 'boolean') {
    issues.push({
      step: 'sourcing',
      v2Section: 'sourcingVisibility',
      message: 'Application acceptance (open/closed) must be set before publish.',
    });
  }
  if (!hasText(src.shortlistStrategy)) {
    issues.push({
      step: 'sourcing',
      v2Section: 'sourcingVisibility',
      message: 'Shortlist strategy is required before publish.',
    });
  }

  if (!hasText(s.marketRegion)) {
    issues.push({
      step: 'location',
      v2Section: 'strategy',
      message: 'Add a market/region before publishing.',
    });
  }

  if (rv.reviewConfirmed !== true) {
    issues.push({
      step: 'review',
      v2Section: 'reviewLaunch',
      message: 'Confirm the review step before publishing.',
    });
  }

  return issues;
}

function appendPolicyQualitySignals(
  input: CampaignPublishInput,
  policy: CampaignPublishPolicy,
  enablePolicyWarnings: boolean,
  blockingIssues: CampaignPublishValidationIssue[],
  warningIssues: CampaignPublishValidationIssue[]
) {
  if (!enablePolicyWarnings) return;

  const brief = getBriefV2(input);
  const followerMin =
    brief && typeof brief.audienceCreatorFit.followerRangeMin === 'number'
      ? brief.audienceCreatorFit.followerRangeMin
      : 0;
  const engagementMinPct =
    brief && typeof brief.audienceCreatorFit.engagementRateMinPct === 'number'
      ? brief.audienceCreatorFit.engagementRateMinPct
      : 0;

  if (followerMin <= 0 && engagementMinPct <= 0) {
    const issue: CampaignPublishValidationIssue = {
      step: 'audience_social',
      v2Section: 'audienceCreatorFit',
      code: 'wide_audience',
      message:
        'Follower and engagement filters are at minimum; match estimates may be less reliable (wide audience).',
    };
    if (policy.treatWideAudienceAsBlocking) blockingIssues.push(issue);
    else warningIssues.push(issue);
  }

  if (brief && brief.strategy.primaryKpiTarget <= 0) {
    const issue: CampaignPublishValidationIssue = {
      step: 'basics',
      v2Section: 'strategy',
      code: 'low_confidence_kpi',
      message:
        'Primary KPI target is unset; campaign specificity may be too low for strong match confidence.',
    };
    if (policy.treatLowConfidenceAsBlocking) blockingIssues.push(issue);
    else warningIssues.push(issue);
  }
}

/** V2 brief signals not fully covered by legacy matrix checks (policy-classified). */
function appendV2BriefQualitySignals(
  brief: CampaignBriefV2,
  input: CampaignPublishInput,
  enablePolicyWarnings: boolean,
  warningIssues: CampaignPublishValidationIssue[]
) {
  if (!enablePolicyWarnings) return;

  const pillars = brief.contentDeliverables.messagePillars ?? [];
  if (pillars.length === 0) {
    warningIssues.push({
      step: 'brand_fit',
      v2Section: 'contentDeliverables',
      code: 'thin_message_pillars',
      message: 'Add at least one message pillar in content & deliverables for clearer creator guidance.',
    });
  }

  const bundle = brief.contentDeliverables.deliverableBundle ?? [];
  if (bundle.length === 0 && input.workflowPresetSource === 'template') {
    warningIssues.push({
      step: 'presets',
      v2Section: 'contentDeliverables',
      code: 'no_deliverable_specs',
      message:
        'Template path has no structured deliverables in the brief; confirm formats and counts match the selected package.',
    });
  }

  if (
    brief.reviewLaunch.reviewConfirmed === true &&
    input.workflowPublishReviewConfirmed !== true
  ) {
    warningIssues.push({
      step: 'review',
      v2Section: 'reviewLaunch',
      code: 'review_brief_ui_mismatch',
      message: 'Brief marks review as confirmed but the publish checklist is not confirmed; align before launch.',
    });
  }
}

/**
 * Full publish validation with blocking vs warning split (V2 policy-aware).
 */
export function validateCampaignPublish(
  input: CampaignPublishInput,
  options?: ValidateCampaignPublishOptions
): CampaignPublishValidationResult {
  const policy = resolveCampaignPublishPolicy(options?.policy);
  const enablePolicyWarnings = options?.enablePolicyWarnings !== false;

  const briefV2 = getBriefV2(input);
  const blockingIssues = briefV2
    ? collectV2WizardBlockingIssues(input, briefV2)
    : [
        {
          step: 'basics' as const,
          v2Section: 'strategy' as const,
          code: 'missing_campaign_brief_v2',
          message: 'campaignBriefV2 is required for publish in V2 mode.',
        },
      ];
  const warningIssues: CampaignPublishValidationIssue[] = [];

  appendPolicyQualitySignals(input, policy, enablePolicyWarnings, blockingIssues, warningIssues);

  if (briefV2) {
    appendV2BriefQualitySignals(briefV2, input, enablePolicyWarnings, warningIssues);
  }

  const completenessBySection = buildCompletenessBySection(blockingIssues);

  return { blockingIssues, warningIssues, completenessBySection };
}

/**
 * Legacy helper: returns only issues that block publish (same shape as pre–Phase 4).
 * Policy-driven quality signals are omitted when policy warnings are disabled via this path.
 */
export function validateCampaignPublishInput(input: CampaignPublishInput): CampaignPublishValidationIssue[] {
  return validateCampaignPublish(input, { enablePolicyWarnings: false }).blockingIssues;
}

/** Human-readable single string for API responses (blocking issues only). */
export function formatCampaignPublishIssues(issues: CampaignPublishValidationIssue[]): string {
  return issues.map((i) => i.message).join('; ');
}

export function formatCampaignPublishBlockingError(result: CampaignPublishValidationResult): string {
  return formatCampaignPublishIssues(result.blockingIssues);
}

export class CampaignPublishRejectedError extends Error {
  readonly blockingIssues: CampaignPublishValidationIssue[];
  readonly warningIssues: CampaignPublishValidationIssue[];
  readonly completenessBySection: CampaignPublishValidationResult['completenessBySection'];

  constructor(result: CampaignPublishValidationResult) {
    super(formatCampaignPublishBlockingError(result));
    this.name = 'CampaignPublishRejectedError';
    this.blockingIssues = result.blockingIssues;
    this.warningIssues = result.warningIssues;
    this.completenessBySection = result.completenessBySection;
    Object.setPrototypeOf(this, CampaignPublishRejectedError.prototype);
  }
}
