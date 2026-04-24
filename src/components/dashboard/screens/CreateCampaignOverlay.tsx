'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  Zap,
  Calendar,
  Video,
  Image as ImageIcon,
  FileText,
  MapPin,
  Globe,
  Lock,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { authFetch } from '@/lib/authFetch';
import type { CampaignDraftOverlayPrefill } from '@/lib/campaigns/clientMap';
import {
  isMatchPreviewStale,
  MATCH_PREVIEW_DEFAULT_STALE_AFTER_MS,
} from '@/lib/campaigns/matchPreview';
import {
  CampaignPublishRejectedError,
  resolveCampaignPublishPolicy,
  validateCampaignPublish,
  type CampaignBriefV2SectionKey,
  type CampaignPublishValidationResult,
} from '@/lib/campaigns/publishValidation';
import type {
  CampaignBriefV2,
  CtaTypeV2,
  DeliverableSpecV2,
  ObjectiveTypeV2,
  PaymentModelV2,
  PrimaryKpiV2,
  ShortlistStrategyV2,
  UsageRightsModeV2,
  VisibilityV2,
} from '@/lib/campaigns/campaignBriefV2Mapper';
import {
  normalizeCampaignBriefV2,
  OBJECTIVE_TYPE_LABELS,
  normalizePlatformSlug,
  parseBudgetSingleAmount,
} from '@/lib/campaigns/campaignBriefV2Mapper';
import {
  buildCampaignBriefV2FromWizardState,
  hydrateOverlayFromCampaignBriefV2,
  type CampaignTemplateListItem,
  type WizardV2TemplateSelection,
} from '@/lib/campaigns/createCampaignWizardV2';
import {
  computeV2CostForecastRange,
  computeV2ReviewRiskFlags,
  stableSerializeForAutosave,
} from '@/lib/campaigns/reviewV2Heuristics';

const STEPS = [
  { id: 1, label: 'Campaign Strategy' },
  { id: 2, label: 'Audience & Creator Fit' },
  { id: 3, label: 'Content & Deliverables' },
  { id: 4, label: 'Budget & Rights' },
  { id: 5, label: 'Sourcing & Visibility' },
  { id: 6, label: 'Review & Launch' },
] as const;

const STEP_COUNT = 6;
const REVIEW_STEP = 6;

const packages = [
  {
    id: 'grand-opening',
    name: 'Grand Opening Promo',
    subtitle: 'High-visibility launch with social momentum.',
    priceLevel: '$$',
    tag: 'Most Popular',
    deliverables: ['1 Reel (Main Feed)', '2 Stories w/ Link'],
    platforms: ['Instagram', 'TikTok'],
  },
  {
    id: 'local-awareness',
    name: 'Local Awareness',
    subtitle: 'Cost-efficient reach for regional audiences.',
    priceLevel: '$',
    tag: null,
    deliverables: ['1 Static Post', '1 Story Mention'],
    platforms: ['Instagram'],
  },
  {
    id: 'reel-story',
    name: 'Reel + Story Bundle',
    subtitle: 'Balanced short-form package for steady conversion.',
    priceLevel: '$$$',
    tag: null,
    deliverables: ['2 Reels (Collaborator)', '4 Stories (48h apart)'],
    platforms: ['Instagram', 'TikTok'],
  },
  {
    id: 'ugc-photo',
    name: 'UGC Photo Package',
    subtitle: 'Asset-focused package for owned content libraries.',
    priceLevel: '$$',
    tag: null,
    deliverables: ['5 High-Res UGC Photos', '1 Testimonial Clip'],
    platforms: ['Rights Only'],
  },
];

const OBJECTIVE_TYPE_OPTIONS: { value: ObjectiveTypeV2; label: string }[] = (
  ['awareness', 'consideration', 'conversion', 'ugc_library'] as const
).map((value) => ({ value, label: OBJECTIVE_TYPE_LABELS[value] }));

const CTA_TYPE_OPTIONS: { value: CtaTypeV2; label: string }[] = [
  { value: 'learn_more', label: 'Learn more' },
  { value: 'shop_now', label: 'Shop now' },
  { value: 'sign_up', label: 'Sign up' },
  { value: 'apply', label: 'Apply' },
  { value: 'custom', label: 'Custom' },
];

const PAYMENT_MODEL_OPTIONS: { value: PaymentModelV2; label: string }[] = [
  { value: 'flat', label: 'Flat fee' },
  { value: 'performance', label: 'Performance' },
  { value: 'hybrid', label: 'Hybrid' },
];

const USAGE_MODE_OPTIONS: { value: UsageRightsModeV2; label: string }[] = [
  { value: 'organic_only', label: 'Organic only' },
  { value: 'paid_usage', label: 'Paid usage' },
];

const SHORTLIST_OPTIONS: { value: ShortlistStrategyV2; label: string }[] = [
  { value: 'manual', label: 'Manual shortlist' },
  { value: 'assisted', label: 'Assisted matching' },
];

const V2_PLATFORM_CHOICES = [
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'tiktok', label: 'TikTok' },
] as const;

const STEP_INFO: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: 'Campaign Strategy',
    subtitle: 'Name, opportunity context, goals, and the short brief creators will follow.',
  },
  2: {
    title: 'Audience & Creator Fit',
    subtitle: 'Sport, reach, and engagement filters for athlete alignment.',
  },
  3: {
    title: 'Content & Deliverables',
    subtitle: 'Preset packages set structure and deliverables; you can still customize later.',
  },
  4: {
    title: 'Budget & Rights',
    subtitle: 'Budget range and timing. Offer terms and usage rights are finalized in the deal flow.',
  },
  5: {
    title: 'Sourcing & Visibility',
    subtitle: 'Applications, marketplace visibility, and where athletes should be relevant.',
  },
  6: {
    title: 'Review & Launch',
    subtitle: 'Confirm details, check match estimate, then publish.',
  },
};

export type MatchPreviewStatus =
  | 'ready'
  | 'insufficient_filters'
  | 'broad_estimate'
  | 'no_matches'
  | 'refreshing'
  | 'stale';

export type CampaignSubmitBody = {
  name: string;
  visibility: 'Public' | 'Private';
  acceptApplications: boolean;
  /** Persisted for publish checks: template package vs custom scratch wizard path. */
  workflowPresetSource: 'template' | 'scratch';
  /** Required for publish — user confirms the review step in the UI. */
  workflowPublishReviewConfirmed: boolean;
  /** Structured brief for storage + publish checks. */
  campaignBriefV2?: CampaignBriefV2;
};

/** @deprecated Use CampaignSubmitBody */
export type CreateCampaignPayload = CampaignSubmitBody;

const V2_SECTION_ORDER: readonly CampaignBriefV2SectionKey[] = [
  'strategy',
  'audienceCreatorFit',
  'contentDeliverables',
  'budgetRights',
  'sourcingVisibility',
  'reviewLaunch',
] as const;

function v2SectionLabel(section: CampaignBriefV2SectionKey | undefined): string {
  if (!section) return 'General';
  const labels: Record<CampaignBriefV2SectionKey, string> = {
    strategy: 'Campaign strategy',
    audienceCreatorFit: 'Audience & creator fit',
    contentDeliverables: 'Content & deliverables',
    budgetRights: 'Budget & rights',
    sourcingVisibility: 'Sourcing & visibility',
    reviewLaunch: 'Review & launch',
  };
  return labels[section];
}

function SectionCompletenessChips({
  completeness,
}: {
  completeness: NonNullable<CampaignPublishValidationResult['completenessBySection']>;
}) {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900/90">
        Section readiness (blocking only)
      </p>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Publish readiness by brief section">
        {V2_SECTION_ORDER.map((key) => {
          const ok = completeness[key];
          if (ok === undefined) return null;
          return (
            <li
              key={key}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                ok ? 'bg-emerald-100 text-emerald-950' : 'bg-red-100 text-red-950'
              }`}
            >
              {v2SectionLabel(key)}: {ok ? 'Ready' : 'Needs fix'}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatEstimateAgeShort(iso: string, nowMs: number): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const sec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m old`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m old` : `${h}h old`;
}

function matchPreviewStatusLabel(status: string): string {
  switch (status) {
    case 'ready':
      return 'Estimate ready';
    case 'insufficient_filters':
      return 'Add more filters for a tighter estimate';
    case 'broad_estimate':
      return 'Broad estimate — narrow filters if you can';
    case 'no_matches':
      return 'No matches for this filter set';
    case 'refreshing':
      return 'Refreshing estimate…';
    case 'stale':
      return 'Estimate may be stale — save changes and check again';
    default:
      return status;
  }
}

function WizardStepChecklistRail({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: readonly { id: number; label: string }[];
}) {
  const total = steps.length;
  const denom = Math.max(1, total - 1);
  const currentIdx = Math.max(0, Math.min(total - 1, currentStep - 1));
  const progressPct = total <= 1 ? 100 : (currentIdx / denom) * 100;
  const roundedPct = Math.round(progressPct);
  const activeLabel = steps[currentIdx]?.label ?? `Step ${currentStep}`;

  return (
    <nav aria-label="Campaign wizard steps" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={currentStep}
        aria-valuetext={`Step ${currentStep} of ${total}: ${activeLabel}, ${roundedPct} percent`}
        className="mb-4 shrink-0 rounded-lg border border-gray-200/80 bg-white px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Step {currentStep}/{total}
          </span>
          <span className="text-xs font-semibold tabular-nums text-gray-600">{roundedPct}%</span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-nilink-accent to-[#5ab8d4] transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ol className="min-h-0 flex-1 list-none space-y-1.5 overflow-y-auto overscroll-contain p-0">
        {steps.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const stateLabel = isDone ? `${s.label}, completed` : isCurrent ? `${s.label}, current step` : `${s.label}, upcoming`;
          return (
            <li
              key={s.id}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={stateLabel}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                isCurrent
                  ? 'border-nilink-accent/35 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]'
                  : isDone
                    ? 'border-gray-200/80 bg-white/90'
                    : 'border-transparent bg-transparent'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isDone
                    ? 'bg-nilink-accent text-white shadow-[0_4px_12px_rgba(42,144,176,0.28)]'
                    : isCurrent
                      ? 'border-2 border-nilink-accent bg-white text-nilink-accent shadow-[0_0_0_4px_rgba(42,144,176,0.12)]'
                      : 'border border-gray-300 bg-white text-gray-400'
                }`}
                aria-hidden={true}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : s.id}
              </span>
              <span
                className={`min-w-0 flex-1 leading-snug ${
                  isCurrent ? 'font-bold text-gray-900' : isDone ? 'font-semibold text-gray-700' : 'font-medium text-gray-500'
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type SubmitCampaignArgs = {
  body: CampaignSubmitBody;
  intent: 'draft' | 'publish';
  campaignId: string | null;
  /** When true, parent should avoid noisy global error toasts (e.g. background autosave). */
  quiet?: boolean;
};

export type DraftResumeSession = {
  campaignId: string;
  prefill: CampaignDraftOverlayPrefill;
};

interface Props {
  onClose: () => void;
  onSubmitCampaign: (args: SubmitCampaignArgs) => Promise<{ campaignId: string }>;
  /** When present, form is prefilled and PATCH uses this campaign id for save/publish. */
  draftResume?: DraftResumeSession | null;
  /**
   * Deletes a persisted draft on the server (same as list discard). Only invoked when the user
   * confirms discard and `campaignId` is set — never for abandon-only flows without a server id.
   */
  onDiscardPersistedDraft?: (campaignId: string) => Promise<void>;
  /** Initial step (1–6) when the wizard instance mounts; stable per parent `key`. */
  initialStep?: number;
  /** Notifies parent for session persistence (e.g. sessionStorage) when the active step changes. */
  onWizardStepChange?: (step: number) => void;
  /** Notifies parent when a server-backed draft id exists or changes (autosave / resume). */
  onPersistedCampaignIdChange?: (campaignId: string | null) => void;
}

function clampWizardStep(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return 1;
  return Math.min(STEP_COUNT, Math.max(1, Math.round(raw)));
}

export function CreateCampaignOverlay({
  onClose,
  onSubmitCampaign,
  draftResume = null,
  onDiscardPersistedDraft,
  initialStep = 1,
  onWizardStepChange,
  onPersistedCampaignIdChange,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(() => clampWizardStep(initialStep));
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [submitKind, setSubmitKind] = useState<null | 'draft' | 'publish'>(null);
  const [discardBusy, setDiscardBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = submitKind !== null || discardBusy;
  const submitKindRef = useRef<null | 'draft' | 'publish'>(null);
  const autosaveInFlightRef = useRef(false);
  useEffect(() => {
    submitKindRef.current = submitKind;
  }, [submitKind]);
  const lastSavedDraftSigRef = useRef<string | null>(null);
  const [saveDraftButtonState, setSaveDraftButtonState] = useState<'idle' | 'saved'>('idle');
  const [templateSaveName, setTemplateSaveName] = useState('');
  const [templateSaveDesc, setTemplateSaveDesc] = useState('');
  const [templateSaveBusy, setTemplateSaveBusy] = useState(false);
  const [templateSaveFeedback, setTemplateSaveFeedback] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [opportunityContext, setOpportunityContext] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [brief, setBrief] = useState('');

  const budgetRangeInverted = useMemo(() => {
    const lo = parseBudgetSingleAmount(budgetMin);
    const hi = parseBudgetSingleAmount(budgetMax);
    return lo > 0 && hi > 0 && lo > hi;
  }, [budgetMin, budgetMax]);

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const selectedPkg = packages.find((p) => p.id === selectedPackage);

  const [sport, setSport] = useState('All Sports');
  const [gender, setGender] = useState('Any');
  const [followerMin, setFollowerMin] = useState(0);

  const [acceptApplications, setAcceptApplications] = useState(true);
  const [visibility, setVisibility] = useState<'Public' | 'Private'>('Public');

  const [locationRadius, setLocationRadius] = useState('');

  const [reviewPublishConfirmed, setReviewPublishConfirmed] = useState(false);

  const [objectiveType, setObjectiveType] = useState<ObjectiveTypeV2>('awareness');
  const [primaryKpi, setPrimaryKpi] = useState<PrimaryKpiV2>('engagement_rate');
  const [primaryKpiTarget, setPrimaryKpiTarget] = useState(3);
  const [secondaryKpi, setSecondaryKpi] = useState<PrimaryKpiV2 | ''>('');
  const [secondaryKpiTarget, setSecondaryKpiTarget] = useState('');
  const [marketRegion, setMarketRegion] = useState('NA');
  const [v2Platforms, setV2Platforms] = useState<string[]>(['instagram']);
  const [deliverableBundle, setDeliverableBundle] = useState<DeliverableSpecV2[]>([]);
  const [ctaType, setCtaType] = useState<CtaTypeV2>('learn_more');
  const [messagePillars, setMessagePillars] = useState<string[]>([]);
  const [mustSayLines, setMustSayLines] = useState('');
  const [mustAvoidLines, setMustAvoidLines] = useState('');
  const [draftRequired, setDraftRequired] = useState(true);
  const [revisionRounds, setRevisionRounds] = useState(1);
  const [paymentModel, setPaymentModel] = useState<PaymentModelV2>('flat');
  const [usageRightsMode, setUsageRightsMode] = useState<UsageRightsModeV2>('organic_only');
  const [usageDurationDays, setUsageDurationDays] = useState(90);
  const [shortlistStrategy, setShortlistStrategy] = useState<ShortlistStrategyV2>('manual');
  const [visibilityV2, setVisibilityV2] = useState<VisibilityV2>('public');
  const [templateSelection, setTemplateSelection] = useState<WizardV2TemplateSelection>({ source: 'blank' });
  /** Step 1: strategy fields show only after user picks Start blank or a saved template card. */
  const [strategyTemplatePathConfirmed, setStrategyTemplatePathConfirmed] = useState(false);

  const [templates, setTemplates] = useState<CampaignTemplateListItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewFetchNonce, setPreviewFetchNonce] = useState(0);
  const [previewAgeTick, setPreviewAgeTick] = useState(0);
  const [previewAutoRefresh, setPreviewAutoRefresh] = useState(false);
  const [previewAutoRefreshMinutes, setPreviewAutoRefreshMinutes] = useState(5);
  const [previewData, setPreviewData] = useState<{
    status: MatchPreviewStatus;
    range: { min: number; max: number };
    confidence?: string;
    confidenceScore?: number;
    confidenceReason?: string;
    disclaimer?: string;
    computedAt?: string;
    version?: string;
    modelVersion?: string;
    inputHash?: string;
    staleAfterMs?: number;
    recommendedRefreshSec?: number;
    staleness?: {
      strategy: string;
      staleAfterMs: number;
      referenceField: string;
    };
  } | null>(null);

  useEffect(() => {
    if (!draftResume) return;
    const p = draftResume.prefill;
    setCampaignId(draftResume.campaignId);
    setStep(clampWizardStep(initialStep));
    setSubmitError(null);

    const h = hydrateOverlayFromCampaignBriefV2(p.campaignBriefV2Hydration);
    setCampaignName(h.campaignName);
    setOpportunityContext(h.opportunityContext);
    setBudgetMin(h.budgetMin);
    setBudgetMax(h.budgetMax);
    setStartDate(h.startDate);
    setEndDate(h.endDate);
    setBrief(h.brief);
    setSelectedPackage(p.selectedPackage);
    setSport(h.sport);
    setGender(h.gender);
    setFollowerMin(h.followerMin);
    setAcceptApplications(h.acceptApplications);
    setVisibility(h.visibility);
    setVisibilityV2(h.visibilityV2);
    setLocationRadius(h.locationRadius);
    setReviewPublishConfirmed(h.reviewPublishConfirmed);
    setObjectiveType(h.objectiveType);
    setPrimaryKpi(h.primaryKpi);
    setPrimaryKpiTarget(h.primaryKpiTarget);
    setSecondaryKpi(h.secondaryKpi);
    setSecondaryKpiTarget(h.secondaryKpiTarget);
    setMarketRegion(h.marketRegion?.trim() || 'NA');
    setV2Platforms(h.platforms.length > 0 ? h.platforms : ['instagram']);
    setDeliverableBundle(h.deliverableBundle);
    setCtaType(h.ctaType);
    setMessagePillars(h.messagePillars);
    setMustSayLines(h.mustSayLines);
    setMustAvoidLines(h.mustAvoidLines);
    setDraftRequired(h.draftRequired);
    setRevisionRounds(h.revisionRounds);
    setPaymentModel(h.paymentModel);
    setUsageRightsMode(h.usageRightsMode);
    setUsageDurationDays(h.usageDurationDays);
    setShortlistStrategy(h.shortlistStrategy);
    if (!p.hadPersistedCampaignBriefV2) {
      setTemplateSelection({ source: 'blank' });
    } else {
      setTemplateSelection(
        h.templateSelection.source ? h.templateSelection : { source: 'blank' }
      );
    }
    setStrategyTemplatePathConfirmed(true);
  }, [draftResume, initialStep]);

  useEffect(() => {
    onWizardStepChange?.(step);
  }, [step, onWizardStepChange]);

  useEffect(() => {
    onPersistedCampaignIdChange?.(campaignId);
  }, [campaignId, onPersistedCampaignIdChange]);

  useEffect(() => {
    let cancelled = false;
    setTemplatesLoading(true);
    setTemplatesError(null);
    void authFetch('/api/campaign-templates?scope=all')
      .then(async (res) => {
        const raw = (await res.json()) as {
          templates?: Array<Omit<CampaignTemplateListItem, 'defaults'> & { defaults: unknown }>;
          error?: string;
        };
        if (!res.ok) throw new Error(raw.error || 'Could not load templates');
        const rows = raw.templates ?? [];
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          version: r.version,
          orgId: r.orgId,
          defaults: normalizeCampaignBriefV2(r.defaults),
        }));
      })
      .then((rows) => {
        if (!cancelled) setTemplates(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setTemplatesError(e instanceof Error ? e.message : 'Template load failed');
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPackage) return;
    const pkg = packages.find((p) => p.id === selectedPackage);
    if (!pkg) return;
    setDeliverableBundle(
      pkg.deliverables.map((line) => ({
        platform: normalizePlatformSlug(pkg.platforms[0] ?? 'instagram'),
        format: 'custom',
        quantity: 1,
        notes: line,
      }))
    );
    const platSlugs = pkg.platforms
      .filter((p) => p.trim().toLowerCase() !== 'rights only')
      .map((p) => normalizePlatformSlug(p))
      .filter((s, i, a) => a.indexOf(s) === i);
    setV2Platforms(platSlugs.length > 0 ? platSlugs : ['instagram']);
  }, [selectedPackage]);

  const applyServerTemplate = (t: CampaignTemplateListItem) => {
    const merged = normalizeCampaignBriefV2({
      ...(t.defaults as Record<string, unknown>),
      templateMeta: {
        templateId: t.id,
        templateVersion: t.version,
        source: t.orgId ? 'org' : 'system',
      },
    });
    const h = hydrateOverlayFromCampaignBriefV2(merged);
    setCampaignName(h.campaignName);
    setOpportunityContext(h.opportunityContext);
    setBudgetMin(h.budgetMin);
    setBudgetMax(h.budgetMax);
    setStartDate(h.startDate);
    setEndDate(h.endDate);
    setBrief(h.brief);
    setSport(h.sport);
    setGender(h.gender);
    setFollowerMin(h.followerMin);
    setAcceptApplications(h.acceptApplications);
    setVisibility(h.visibility);
    setVisibilityV2(h.visibilityV2);
    setLocationRadius(h.locationRadius);
    setObjectiveType(h.objectiveType);
    setPrimaryKpi(h.primaryKpi);
    setPrimaryKpiTarget(h.primaryKpiTarget);
    setSecondaryKpi(h.secondaryKpi);
    setSecondaryKpiTarget(h.secondaryKpiTarget);
    setMarketRegion(h.marketRegion?.trim() || 'NA');
    setV2Platforms(h.platforms.length > 0 ? h.platforms : ['instagram']);
    setDeliverableBundle(h.deliverableBundle);
    setCtaType(h.ctaType);
    setMessagePillars(h.messagePillars);
    setMustSayLines(h.mustSayLines);
    setMustAvoidLines(h.mustAvoidLines);
    setDraftRequired(h.draftRequired);
    setRevisionRounds(h.revisionRounds);
    setPaymentModel(h.paymentModel);
    setUsageRightsMode(h.usageRightsMode);
    setUsageDurationDays(h.usageDurationDays);
    setShortlistStrategy(h.shortlistStrategy);
    setTemplateSelection({
      templateId: t.id,
      templateVersion: t.version,
      source: t.orgId ? 'org' : 'system',
    });
    setStrategyTemplatePathConfirmed(true);
  };

  const selectBlankStrategyPath = () => {
    setCampaignName('');
    setOpportunityContext('');
    setBudgetMin('');
    setBudgetMax('');
    setStartDate('');
    setEndDate('');
    setBrief('');
    setSelectedPackage(null);
    setSport('All Sports');
    setGender('Any');
    setFollowerMin(0);
    setAcceptApplications(true);
    setVisibility('Public');
    setVisibilityV2('public');
    setLocationRadius('');
    setReviewPublishConfirmed(false);
    setObjectiveType('awareness');
    setPrimaryKpi('engagement_rate');
    setPrimaryKpiTarget(3);
    setSecondaryKpi('');
    setSecondaryKpiTarget('');
    setMarketRegion('NA');
    setV2Platforms(['instagram']);
    setDeliverableBundle([]);
    setCtaType('learn_more');
    setMessagePillars([]);
    setMustSayLines('');
    setMustAvoidLines('');
    setDraftRequired(true);
    setRevisionRounds(1);
    setPaymentModel('flat');
    setUsageRightsMode('organic_only');
    setUsageDurationDays(90);
    setShortlistStrategy('manual');
    setTemplateSelection({ source: 'blank' });
    setStrategyTemplatePathConfirmed(true);
  };

  const buildBody = useCallback((): CampaignSubmitBody => {
    const goalLabel = OBJECTIVE_TYPE_LABELS[objectiveType];

    const workflowPresetSource: CampaignSubmitBody['workflowPresetSource'] =
      templateSelection.source === 'system' || templateSelection.source === 'org'
        ? 'template'
        : selectedPackage
          ? 'template'
          : 'scratch';

    const tb = buildCampaignBriefV2FromWizardState({
      campaignName,
      opportunityContext,
      brief,
      goal: goalLabel,
      startDate,
      endDate,
      sport,
      gender,
      followerMin,
      engagementMinPct: 0,
      brandFitTags: [],
      acceptApplications,
      visibility: visibilityV2 === 'public' ? 'Public' : 'Private',
      locationRadius,
      budgetMin,
      budgetMax,
      reviewPublishConfirmed,
      objectiveType,
      primaryKpi,
      primaryKpiTarget,
      secondaryKpi,
      secondaryKpiTarget,
      marketRegion,
      audiencePersona: opportunityContext || campaignName,
      audienceGeoRequirement: 'open',
      languagePreferencesText: '',
      creatorExclusionsText: '',
      platforms: v2Platforms,
      deliverableBundle,
      ctaType,
      messagePillars,
      mustSayLines,
      mustAvoidLines,
      draftRequired,
      revisionRounds,
      paymentModel,
      usageRightsMode,
      usageDurationDays,
      shortlistStrategy,
      visibilityV2,
      templateSelection,
    });
    const legacyVis = tb.sourcingVisibility.visibility === 'public' ? 'Public' : 'Private';

    return {
      name: tb.strategy.campaignName.trim(),
      visibility: legacyVis,
      acceptApplications: tb.sourcingVisibility.acceptApplications,
      workflowPresetSource,
      workflowPublishReviewConfirmed: tb.reviewLaunch.reviewConfirmed === true,
      campaignBriefV2: tb,
    };
  }, [
    acceptApplications,
    brief,
    budgetMax,
    budgetMin,
    campaignName,
    ctaType,
    deliverableBundle,
    draftRequired,
    endDate,
    followerMin,
    gender,
    locationRadius,
    marketRegion,
    messagePillars,
    mustAvoidLines,
    mustSayLines,
    objectiveType,
    opportunityContext,
    paymentModel,
    primaryKpi,
    primaryKpiTarget,
    reviewPublishConfirmed,
    revisionRounds,
    secondaryKpi,
    secondaryKpiTarget,
    selectedPackage,
    shortlistStrategy,
    sport,
    startDate,
    templateSelection,
    usageDurationDays,
    usageRightsMode,
    v2Platforms,
    visibilityV2,
  ]);

  const buildBodyFnRef = useRef(buildBody);
  buildBodyFnRef.current = buildBody;

  useEffect(() => {
    if (!draftResume?.campaignId) return;
    const t = window.setTimeout(() => {
      lastSavedDraftSigRef.current = stableSerializeForAutosave(buildBodyFnRef.current());
    }, 0);
    return () => window.clearTimeout(t);
  }, [draftResume?.campaignId]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const nameRequiredStep = 1;
  const canProceed = () => {
    if (step === nameRequiredStep) {
      return strategyTemplatePathConfirmed && campaignName.trim().length > 0;
    }
    return true;
  };

  const publishGateBody = useMemo(() => buildBody(), [buildBody]);

  const publishLiveCheck = useMemo(
    () =>
      validateCampaignPublish(publishGateBody as Record<string, unknown>, {
        policy: resolveCampaignPublishPolicy(),
      }),
    [publishGateBody]
  );

  const v2CostForecast = useMemo(
    () => computeV2CostForecastRange(publishGateBody.campaignBriefV2),
    [publishGateBody]
  );

  const v2ReviewRiskFlags = useMemo(
    () =>
      computeV2ReviewRiskFlags({
        secondaryKpi: secondaryKpi === '' ? '' : secondaryKpi,
        creatorExclusionsText: (publishGateBody.campaignBriefV2?.audienceCreatorFit?.creatorExclusions ?? []).join('\n'),
        preview:
          step === REVIEW_STEP && previewData
            ? {
                status: previewData.status,
                confidence: previewData.confidence,
                confidenceScore: previewData.confidenceScore,
              }
            : null,
      }),
    [secondaryKpi, previewData, publishGateBody, step]
  );

  const canPublish = publishLiveCheck.blockingIssues.length === 0;

  const canSaveDraft = campaignName.trim().length > 0;

  const handleNext = () => {
    if (step < STEP_COUNT) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const runSubmit = useCallback(
    async (
      intent: 'draft' | 'publish',
      opts?: { isAutosave?: boolean }
    ): Promise<{ campaignId: string } | undefined> => {
      const isQuietAutosave = Boolean(opts?.isAutosave && intent === 'draft');
      if (!isQuietAutosave) {
        setSubmitError(null);
        setSubmitKind(intent);
      }
      if (isQuietAutosave) autosaveInFlightRef.current = true;
      try {
        const { campaignId: nextId } = await onSubmitCampaign({
          body: buildBody(),
          intent,
          campaignId,
          quiet: isQuietAutosave,
        });
        setCampaignId(nextId);
        lastSavedDraftSigRef.current = stableSerializeForAutosave(buildBody());
        if (intent === 'publish') {
          onClose();
        }
        return { campaignId: nextId };
      } catch (e) {
        if (e instanceof CampaignPublishRejectedError) {
          setSubmitError(e.message);
        } else if (!isQuietAutosave) {
          setSubmitError(intent === 'draft' ? 'Could not save draft' : 'Could not publish campaign');
        }
        return undefined;
      } finally {
        if (isQuietAutosave) {
          autosaveInFlightRef.current = false;
        } else {
          setSubmitKind(null);
        }
      }
    },
    [buildBody, campaignId, onClose, onSubmitCampaign]
  );

  const handleSaveDraft = async () => {
    if (!canSaveDraft || busy) return;
    const result = await runSubmit('draft');
    if (result) setSaveDraftButtonState('saved');
  };

  const handleDiscardOrAbandon = useCallback(async () => {
    const persistedId = campaignId;
    const title = campaignName.trim() || 'Untitled campaign';
    const message = persistedId
      ? `Discard draft "${title}"? It will be permanently removed from your account.`
      : 'Leave campaign creation? Nothing has been saved yet and your entries will be lost.';
    if (!window.confirm(message)) return;
    if (persistedId) {
      if (!onDiscardPersistedDraft) {
        setSubmitError('Discard is not available. Close the wizard and try again from the campaign list.');
        return;
      }
      setSubmitError(null);
      setDiscardBusy(true);
      try {
        await onDiscardPersistedDraft(persistedId);
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not discard draft';
        setSubmitError(msg);
      } finally {
        setDiscardBusy(false);
      }
      return;
    }
    onClose();
  }, [campaignId, campaignName, onClose, onDiscardPersistedDraft]);

  const handleLaunch = () => {
    if (!canPublish || busy) return;
    void runSubmit('publish');
  };

  useEffect(() => {
    if (!campaignName.trim()) return;
    const id = window.setTimeout(() => {
      void (async () => {
        if (submitKindRef.current !== null) return;
        if (autosaveInFlightRef.current) return;
        const body = buildBodyFnRef.current();
        const sig = stableSerializeForAutosave(body);
        if (sig === lastSavedDraftSigRef.current) return;
        await runSubmit('draft', { isAutosave: true });
      })();
    }, 3000);
    return () => window.clearTimeout(id);
  }, [campaignName, runSubmit]);

  useEffect(() => {
    if (saveDraftButtonState !== 'saved') return;
    const t = window.setTimeout(() => setSaveDraftButtonState('idle'), 2000);
    return () => window.clearTimeout(t);
  }, [saveDraftButtonState]);

  useEffect(() => {
    if (step !== REVIEW_STEP) return;
    setTemplateSaveName((prev) => (prev.trim() ? prev : campaignName.trim()));
  }, [step, campaignName]);

  const handleSaveAsTemplate = async () => {
    if (templateSaveBusy || busy) return;
    const name = templateSaveName.trim() || campaignName.trim();
    if (!name) {
      setTemplateSaveFeedback('Enter a template name or campaign name first.');
      return;
    }
    setTemplateSaveFeedback(null);
    setTemplateSaveBusy(true);
    try {
      let id = campaignId;
      if (!id) {
        const r = await runSubmit('draft');
        id = r?.campaignId ?? null;
      }
      if (!id) {
        setTemplateSaveFeedback('Save a draft first to generate a campaign id.');
        return;
      }
      const res = await authFetch(`/api/campaigns/${id}/save-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: templateSaveDesc.trim() || undefined,
        }),
      });
      const raw = (await res.json()) as {
        error?: string;
        template?: { id: string; name: string; version: number; orgId?: string };
      };
      if (!res.ok) throw new Error(raw.error || 'Could not save template');
      const tpl = raw.template;
      if (!tpl?.id) throw new Error('Invalid template response');
      setTemplateSelection({
        templateId: tpl.id,
        templateVersion: tpl.version,
        source: tpl.orgId ? 'org' : 'system',
      });
      setTemplateSaveFeedback(`Saved template "${tpl.name}" (v${tpl.version}).`);
    } catch (e: unknown) {
      setTemplateSaveFeedback(e instanceof Error ? e.message : 'Template save failed');
    } finally {
      setTemplateSaveBusy(false);
    }
  };

  const handleMatchPreviewRefresh = () => {
    if (!campaignId || previewLoading) return;
    setPreviewFetchNonce((n) => n + 1);
  };

  useEffect(() => {
    if (step !== REVIEW_STEP || !campaignId || !previewAutoRefresh) return;
    const minutes = Number.isFinite(previewAutoRefreshMinutes)
      ? Math.min(60, Math.max(1, Math.round(previewAutoRefreshMinutes)))
      : 5;
    const ms = minutes * 60_000;
    const id = window.setInterval(() => {
      setPreviewFetchNonce((n) => n + 1);
    }, ms);
    return () => window.clearInterval(id);
  }, [step, campaignId, previewAutoRefresh, previewAutoRefreshMinutes]);

  useEffect(() => {
    if (step !== REVIEW_STEP || !previewData?.computedAt || previewLoading) return;
    const id = window.setInterval(() => {
      setPreviewAgeTick((t) => t + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [step, previewData?.computedAt, previewLoading, previewFetchNonce]);

  useEffect(() => {
    if (step !== REVIEW_STEP || !campaignId) {
      setPreviewData(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData({
      status: 'refreshing',
      range: { min: 0, max: 0 },
    });
    void authFetch(`/api/campaigns/${campaignId}/match-preview`)
      .then(async (res) => {
        const raw = (await res.json()) as {
          error?: string;
          estimatedMatch?: {
            status: string;
            range?: { min: number; max: number };
            confidence?: string;
            confidenceScore?: number;
            confidenceReason?: string;
            disclaimer?: string;
            computedAt?: string;
            version?: string;
            modelVersion?: string;
            inputHash?: string;
            staleAfterMs?: number;
            recommendedRefreshSec?: number;
            staleness?: {
              strategy: string;
              staleAfterMs: number;
              referenceField: string;
            };
          };
        };
        if (!res.ok) {
          throw new Error(raw.error || 'Match preview failed');
        }
        const em = raw.estimatedMatch;
        if (!em?.status) throw new Error('Invalid preview response');
        return em;
      })
      .then((em) => {
        if (cancelled) return;
        const computedAt = em.computedAt;
        const staleAfterMs =
          typeof em.staleAfterMs === 'number' && Number.isFinite(em.staleAfterMs) && em.staleAfterMs > 0
            ? em.staleAfterMs
            : MATCH_PREVIEW_DEFAULT_STALE_AFTER_MS;
        const confidenceScore =
          typeof em.confidenceScore === 'number' && Number.isFinite(em.confidenceScore)
            ? Math.min(1, Math.max(0, em.confidenceScore))
            : undefined;
        setPreviewData({
          status: em.status as MatchPreviewStatus,
          range: em.range ?? { min: 0, max: 0 },
          confidence: em.confidence,
          confidenceScore,
          confidenceReason: em.confidenceReason,
          disclaimer: em.disclaimer,
          computedAt,
          version: em.version,
          modelVersion: em.modelVersion,
          inputHash: em.inputHash,
          staleAfterMs,
          recommendedRefreshSec: em.recommendedRefreshSec,
          staleness: em.staleness,
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setPreviewError(e instanceof Error ? e.message : 'Preview error');
          setPreviewData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, campaignId, previewFetchNonce]);

  const toggleV2PlatformSlug = (slug: string) => {
    setV2Platforms((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      return next.length === 0 ? ['instagram'] : next;
    });
  };

  const updateDeliverableRow = (idx: number, patch: Partial<DeliverableSpecV2>) => {
    setDeliverableBundle((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeDeliverableRow = (idx: number) => {
    setDeliverableBundle((rows) => rows.filter((_, i) => i !== idx));
  };

  const addDeliverableRow = () => {
    setDeliverableBundle((rows) => [
      ...rows,
      {
        platform: v2Platforms[0] ?? 'instagram',
        format: 'custom' as const,
        quantity: 1,
        notes: '',
      },
    ]);
  };

  const stepA11y = STEP_INFO[step];
  const showPresets = step === 3;
  const showStrategyV2 = step === 1;
  const showBudgetRightsV2 = step === 4;
  const showAudienceCreatorFitV2 = step === 2;
  const showSourcingVisibilityV2 = step === 5;
  const showReview = step === REVIEW_STEP;
  const editBasicsTargetStep = 1;
  const editPresetTargetStep = 3;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-gray-100">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        role="region"
        aria-labelledby="campaign-wizard-title"
        aria-describedby="campaign-wizard-subtitle campaign-step-desc"
        ref={dialogRef}
        tabIndex={-1}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 sm:gap-3 sm:px-6 sm:py-2 lg:px-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to campaigns list"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back
          </button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm leading-tight">
              <li className="truncate text-gray-500">Campaigns</li>
              <li className="shrink-0 text-gray-300 select-none" aria-hidden>
                /
              </li>
              <li className="truncate font-bold text-nilink-ink" aria-current="page">
                Create Campaign
              </li>
            </ol>
          </nav>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white md:flex-row">
          <aside
            aria-label="Campaign wizard overview"
            className="flex max-h-[min(52vh,28rem)] min-h-0 w-full shrink-0 flex-col border-b border-gray-100 bg-gray-50/95 px-4 py-4 sm:px-5 sm:py-5 md:max-h-none md:w-72 md:border-b-0 md:border-r md:border-gray-100 lg:w-80"
          >
            {draftResume && (
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-nilink-accent">
                Editing saved draft
              </p>
            )}
            <h2
              id="campaign-wizard-title"
              className="text-2xl font-black uppercase tracking-wide sm:text-3xl"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Create campaign
            </h2>
            <p
              id="campaign-wizard-subtitle"
              className="mt-3 text-sm leading-relaxed text-gray-500 sm:mt-4 mb-6 sm:mb-7"
            >
              Guided setup — save anytime as a draft. Use the checklist to see what is left before launch.
            </p>
            <WizardStepChecklistRail currentStep={step} steps={STEPS} />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
            <p className="sr-only">
              Step {step} of {STEP_COUNT}: {stepA11y.title}. {stepA11y.subtitle}
            </p>
            <div
              className={`min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 lg:px-10 xl:px-12 ${
                step === 1 ? 'py-5 sm:py-6 lg:py-7' : 'py-6 sm:py-7 lg:py-8'
              }`}
            >
            <header
              className={`max-w-3xl ${
                step === 1 ? 'mb-6 pb-5' : 'mb-8 pb-6'
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                Step {step} of {STEP_COUNT}
              </p>
              <h2
                className={`font-bold tracking-tight text-nilink-ink text-xl sm:text-2xl ${
                  step === 1 ? 'mt-1' : 'mt-1.5'
                }`}
              >
                {stepA11y.title}
              </h2>
              <p
                id="campaign-step-desc"
                className={`max-w-2xl text-sm leading-relaxed text-gray-500 ${
                  step === 1 ? 'mt-1.5' : 'mt-2'
                }`}
              >
                {stepA11y.subtitle}
              </p>
            </header>
            {submitError && (
              <div className="mb-6 rounded-lg border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900">
                {submitError}
              </div>
            )}

            {showStrategyV2 && (
              <div className="w-full min-w-0 space-y-5">
                <div>
                  <p id="strategy-template-label" className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Campaign template
                  </p>
                  {templatesError ? <p className="mb-3 text-xs text-red-600">{templatesError}</p> : null}
                  {templatesLoading ? <p className="mb-3 text-xs text-gray-500">Loading templates…</p> : null}
                  <div
                    role="radiogroup"
                    aria-labelledby="strategy-template-label"
                    className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:grid-cols-3"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={
                        strategyTemplatePathConfirmed &&
                        templateSelection.source === 'blank' &&
                        !templateSelection.templateId
                      }
                      onClick={selectBlankStrategyPath}
                      className={`rounded-xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 ${
                        strategyTemplatePathConfirmed &&
                        templateSelection.source === 'blank' &&
                        !templateSelection.templateId
                          ? 'border-nilink-accent bg-white shadow-md ring-1 ring-nilink-accent/15'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-7 w-7 shrink-0 text-nilink-accent" aria-hidden />
                        <span className="min-w-0">
                          <span className="block font-bold text-nilink-ink">Start blank</span>
                          <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                            No template defaults — you fill each field yourself.
                          </span>
                        </span>
                      </div>
                    </button>
                    {templates.map((t) => {
                      const selected =
                        strategyTemplatePathConfirmed && templateSelection.templateId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => applyServerTemplate(t)}
                          title={t.description ?? t.name}
                          className={`rounded-xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 ${
                            selected
                              ? 'border-nilink-accent bg-white shadow-md ring-1 ring-nilink-accent/15'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
                          }`}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0 font-bold leading-snug text-nilink-ink">{t.name}</span>
                          </span>
                          {t.description ? (
                            <span className="mt-2 line-clamp-2 block text-xs text-gray-500">{t.description}</span>
                          ) : (
                            <span className="mt-2 block text-xs text-gray-400">Saved organization or system template.</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!strategyTemplatePathConfirmed ? (
                  <p className="text-sm text-gray-600">Select a template card above to show strategy fields.</p>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div>
                        <label
                          htmlFor="ccw-strategy-campaign-name"
                          className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                        >
                          Campaign name <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="ccw-strategy-campaign-name"
                          type="text"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="e.g. Summer Kickoff 2024"
                          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="ccw-objective-type"
                          className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                        >
                          Objective <span className="text-red-400">*</span>
                        </label>
                        <select
                          id="ccw-objective-type"
                          value={objectiveType}
                          onChange={(e) => setObjectiveType(e.target.value as ObjectiveTypeV2)}
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        >
                          {OBJECTIVE_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Date <span className="text-red-400">*</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="ccw-flight-start"
                              className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400"
                            >
                              Start
                            </label>
                            <input
                              id="ccw-flight-start"
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="ccw-flight-end"
                              className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400"
                            >
                              End
                            </label>
                            <input
                              id="ccw-flight-end"
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="ccw-short-brief"
                          className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                        >
                          Opportunity context <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          id="ccw-short-brief"
                          value={brief}
                          onChange={(e) => setBrief(e.target.value)}
                          placeholder="Key talking points and guidelines for athletes."
                          rows={4}
                          className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm leading-relaxed placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {showPresets && (
              <div className="w-full min-w-0 space-y-6">
                    <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6">
                        <div>
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                            Platforms <span className="text-red-400">*</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {V2_PLATFORM_CHOICES.map((p) => {
                              const slug = p.slug;
                              const on = v2Platforms.includes(slug);
                              return (
                                <button
                                  key={slug}
                                  type="button"
                                  onClick={() => toggleV2PlatformSlug(slug)}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-1 ${
                                    on
                                      ? 'border-nilink-accent bg-nilink-accent text-white'
                                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label
                            htmlFor="ccw-message-pillars"
                            className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                          >
                            Message pillars (comma-separated) <span className="text-red-400">*</span>
                          </label>
                          <input
                            id="ccw-message-pillars"
                            type="text"
                            value={messagePillars.join(', ')}
                            onChange={(e) =>
                              setMessagePillars(
                                e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              )
                            }
                            placeholder="e.g. Authentic moments, Clear CTA"
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="ccw-cta-type"
                            className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                          >
                            CTA type
                          </label>
                          <select
                            id="ccw-cta-type"
                            value={ctaType}
                            onChange={(e) => setCtaType(e.target.value as CtaTypeV2)}
                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                          >
                            {CTA_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label
                              htmlFor="ccw-must-say"
                              className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                            >
                              Must say (optional)
                            </label>
                            <textarea
                              id="ccw-must-say"
                              value={mustSayLines}
                              onChange={(e) => setMustSayLines(e.target.value)}
                              placeholder="One line per must-say phrase."
                              rows={3}
                              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="ccw-must-avoid"
                              className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                            >
                              Must avoid (optional)
                            </label>
                            <textarea
                              id="ccw-must-avoid"
                              value={mustAvoidLines}
                              onChange={(e) => setMustAvoidLines(e.target.value)}
                              placeholder="One line per topic to avoid."
                              rows={3}
                              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                              Deliverable bundle
                            </p>
                            <button
                              type="button"
                              onClick={addDeliverableRow}
                              className="rounded-md px-1 py-1.5 text-xs font-bold uppercase tracking-wider text-nilink-accent transition-colors hover:bg-gray-100 hover:text-nilink-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-1"
                            >
                              Add row
                            </button>
                          </div>
                          <div className="space-y-2">
                            {deliverableBundle.length === 0 ? (
                              <p className="text-xs text-gray-500">
                                Pick a preset above to auto-fill rows, or add lines manually.
                              </p>
                            ) : (
                              deliverableBundle.map((row, idx) => (
                                <div key={idx} className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={row.platform}
                                    onChange={(e) =>
                                      updateDeliverableRow(idx, {
                                        platform: normalizePlatformSlug(e.target.value),
                                      })
                                    }
                                    className="min-w-[7rem] rounded-lg border border-gray-200 px-2 py-2 text-xs font-semibold"
                                  >
                                    {V2_PLATFORM_CHOICES.map((p) => (
                                      <option key={p.slug} value={p.slug}>
                                        {p.label}
                                      </option>
                                    ))}
                                    <option value="other">Other</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={row.notes ?? ''}
                                    onChange={(e) => updateDeliverableRow(idx, { notes: e.target.value })}
                                    placeholder="Deliverable description"
                                    className="min-w-[12rem] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeDeliverableRow(idx)}
                                    className="text-xs font-bold text-gray-400 hover:text-red-600"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-nilink-accent focus:ring-nilink-accent"
                              checked={draftRequired}
                              onChange={(e) => setDraftRequired(e.target.checked)}
                            />
                            Draft required before posting
                          </label>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="text-xs font-semibold text-gray-500">Revision rounds</span>
                            <input
                              type="number"
                              min={0}
                              value={revisionRounds}
                              onChange={(e) => setRevisionRounds(Number(e.target.value) || 0)}
                              className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm font-bold"
                            />
                          </div>
                        </div>
                      </div>
              </div>
            )}

            {showAudienceCreatorFitV2 && (
              <div className="space-y-12">
                <section className="space-y-6" aria-labelledby="audience-metrics-heading">
                  <div id="audience-metrics-heading" className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-nilink-ink" aria-hidden />
                    <h3 className="text-base font-semibold text-gray-900">Audience & social metrics</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="ccw-preferred-sport"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                      >
                        Preferred sport
                      </label>
                      <select
                        id="ccw-preferred-sport"
                        value={sport}
                        onChange={(e) => setSport(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      >
                        <option>All Sports</option>
                        <option>Basketball</option>
                        <option>Football</option>
                        <option>Baseball</option>
                        <option>Soccer</option>
                        <option>Track & Field</option>
                        <option>Volleyball</option>
                        <option>Gymnastics</option>
                      </select>
                    </div>
                    <div>
                      <p className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Gender identity
                      </p>
                      <div className="flex gap-2">
                        {(['Any', 'Male', 'Female'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors ${
                              gender === g
                                ? 'border border-nilink-accent bg-nilink-accent text-white'
                                : 'border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="ccw-follower-min"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                      >
                        Follower range (min)
                      </label>
                      <div className="px-1">
                        <input
                          id="ccw-follower-min"
                          type="range"
                          min={0}
                          max={100}
                          value={followerMin}
                          onChange={(e) => setFollowerMin(Number(e.target.value))}
                          className="w-full accent-[#2A90B0]"
                        />
                        <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                          <span>Any</span>
                          <span className="font-bold text-nilink-accent">
                            {followerMin <= 0 ? 'Any' : followerMin >= 100 ? '1M+' : `${followerMin}K+`}
                          </span>
                          <span>1M</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {showBudgetRightsV2 && (
              <div className="w-full min-w-0 space-y-7">
                      <div>
                        <p className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Budget range
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                              $
                            </span>
                            <input
                              id="ccw-budget-min"
                              type="text"
                              value={budgetMin}
                              onChange={(e) => setBudgetMin(e.target.value)}
                              placeholder="5,000"
                              aria-invalid={budgetRangeInverted}
                              aria-label="Budget minimum"
                              className={`w-full rounded-lg border py-3 pl-8 pr-4 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                budgetRangeInverted ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-gray-200'
                              }`}
                            />
                          </div>
                          <span className="font-medium text-gray-300">–</span>
                          <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                              $
                            </span>
                            <input
                              id="ccw-budget-max"
                              type="text"
                              value={budgetMax}
                              onChange={(e) => setBudgetMax(e.target.value)}
                              placeholder="10,000"
                              aria-invalid={budgetRangeInverted}
                              aria-label="Budget maximum"
                              className={`w-full rounded-lg border py-3 pl-8 pr-4 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                budgetRangeInverted ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-gray-200'
                              }`}
                            />
                          </div>
                        </div>
                        {budgetRangeInverted ? (
                          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
                            Minimum must be less than or equal to maximum.
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label
                          htmlFor="ccw-payment-model"
                          className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                        >
                          Payment model
                        </label>
                        <select
                          id="ccw-payment-model"
                          value={paymentModel}
                          onChange={(e) => setPaymentModel(e.target.value as PaymentModelV2)}
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        >
                          {PAYMENT_MODEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="ccw-usage-rights-mode"
                            className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                          >
                            Usage rights mode
                          </label>
                          <select
                            id="ccw-usage-rights-mode"
                            value={usageRightsMode}
                            onChange={(e) => setUsageRightsMode(e.target.value as UsageRightsModeV2)}
                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                          >
                            {USAGE_MODE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="ccw-usage-duration-days"
                            className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                          >
                            Usage duration (days)
                          </label>
                          <input
                            id="ccw-usage-duration-days"
                            type="number"
                            min={1}
                            value={usageDurationDays}
                            onChange={(e) => setUsageDurationDays(Number(e.target.value) || 1)}
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                          />
                        </div>
                      </div>
              </div>
            )}

            {showSourcingVisibilityV2 && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <Zap className="h-6 w-6 text-nilink-accent-bright" />
                      <button
                        type="button"
                        onClick={() => setAcceptApplications(!acceptApplications)}
                        role="switch"
                        aria-checked={acceptApplications}
                        aria-label="Accept applications"
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          acceptApplications ? 'bg-nilink-accent' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                            acceptApplications ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <h3 className="mb-1 text-base font-semibold text-gray-900">Accept applications</h3>
                    <p className="text-xs leading-relaxed text-gray-500">
                      Let athletes discover and apply from the marketplace.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
                    <div className="mb-3 flex items-start gap-2">
                      {visibilityV2 === 'public' ? (
                        <Globe className="h-6 w-6 text-nilink-accent-bright" />
                      ) : (
                        <Lock className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <h3 className="mb-3 text-base font-semibold text-gray-900">Marketplace visibility</h3>
                    <p className="mb-3 text-xs text-gray-500">
                      Stored as V2 visibility on the brief; invite-only maps to legacy Private for listing.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { v: 'public' as const, label: 'Public' },
                          { v: 'invite_only' as const, label: 'Invite-only' },
                          { v: 'private' as const, label: 'Private' },
                        ] as const
                      ).map(({ v, label }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setVisibilityV2(v);
                            setVisibility(v === 'public' ? 'Public' : 'Private');
                          }}
                          className={`min-w-[5.5rem] flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-1 ${
                            visibilityV2 === v
                              ? 'border border-nilink-accent bg-nilink-accent text-white'
                              : 'border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <section className="space-y-3 border-t border-gray-100 pt-10">
                  <h3 className="text-base font-semibold text-gray-900">Shortlist strategy</h3>
                  <p className="text-sm text-gray-500">
                    How you plan to build the creator shortlist for this campaign.
                  </p>
                  <select
                    value={shortlistStrategy}
                    onChange={(e) => setShortlistStrategy(e.target.value as ShortlistStrategyV2)}
                    className="w-full max-w-md appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    {SHORTLIST_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </section>
                <section className="space-y-4 border-t border-gray-100 pt-10">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-nilink-ink" aria-hidden />
                    <h3 className="text-base font-semibold text-gray-900">Location targeting</h3>
                  </div>
                  <label
                    htmlFor="ccw-location-radius"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                  >
                    City, metro, or campus focus
                  </label>
                  <div className="relative max-w-lg">
                    <input
                      id="ccw-location-radius"
                      type="text"
                      value={locationRadius}
                      onChange={(e) => setLocationRadius(e.target.value)}
                      placeholder="e.g. Austin metro or University of Texas"
                      className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                    <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                  </div>
                </section>
              </div>
            )}

            {showReview && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <Calendar className="h-5 w-5 shrink-0 text-gray-400" />
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setStep(editBasicsTargetStep)}
                          className="text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-nilink-ink"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(4)}
                          className="text-xs font-bold uppercase tracking-wider text-nilink-accent transition-colors hover:text-nilink-ink"
                        >
                          Budget & rights
                        </button>
                      </div>
                    </div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Basics
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{campaignName || '—'}</p>
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="text-gray-500">Goal:</span>{' '}
                        {OBJECTIVE_TYPE_LABELS[objectiveType]}
                      </p>
                      <p>
                        <span className="text-gray-500">Duration:</span>{' '}
                        {startDate && endDate ? `${startDate} → ${endDate}` : '—'}
                      </p>
                      <p>
                        <span className="text-gray-500">Budget:</span>{' '}
                        {budgetMin || budgetMax ? `$${budgetMin} – $${budgetMax}` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => setStep(editPresetTargetStep)}
                        className="text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-nilink-ink"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Preset / package
                    </p>
                    {selectedPkg ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-900">{selectedPkg.name}</p>
                        {selectedPkg.deliverables.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <Video className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            {d}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No preset selected</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Filters & sourcing
                  </p>
                  <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2">
                    <p>
                      <span className="text-gray-500">Sport:</span> {sport}
                    </p>
                    <p>
                      <span className="text-gray-500">Gender:</span> {gender}
                    </p>
                    <p>
                      <span className="text-gray-500">Follower min:</span>{' '}
                      {followerMin <= 0 ? 'Any' : `${followerMin}K+`}
                    </p>
                    <p>
                      <span className="text-gray-500">Location:</span> {locationRadius.trim() || '—'}
                    </p>
                    <p>
                      <span className="text-gray-500">Applications:</span>{' '}
                      {acceptApplications ? 'Open' : 'Closed'}
                    </p>
                    <p>
                      <span className="text-gray-500">Visibility:</span> {visibility}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200/80 bg-white p-5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Launch readiness
                    </p>
                    {submitError && (
                      <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                        {submitError}
                      </p>
                    )}
                    {publishLiveCheck.blockingIssues.length === 0 && !submitError && (
                      <p className="mb-4 text-sm font-semibold text-emerald-800">
                        No blocking publish issues detected in the current brief.
                      </p>
                    )}
                    {publishLiveCheck.blockingIssues.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-bold text-red-900">
                          Blocking issues ({publishLiveCheck.blockingIssues.length})
                        </p>
                        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-red-900/90">
                          {publishLiveCheck.blockingIssues.map((issue, idx) => (
                            <li key={`live-b-${idx}-${issue.message}`}>
                              <span className="font-medium">{v2SectionLabel(issue.v2Section)}:</span>{' '}
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {publishLiveCheck.completenessBySection &&
                      Object.keys(publishLiveCheck.completenessBySection).length > 0 &&
                      publishLiveCheck.blockingIssues.length > 0 && (
                        <SectionCompletenessChips completeness={publishLiveCheck.completenessBySection} />
                      )}
                    {publishLiveCheck.warningIssues.length > 0 && (
                      <div
                        className={
                          publishLiveCheck.blockingIssues.length > 0
                            ? 'mt-4 border-t border-amber-200/80 pt-4'
                            : 'mt-0'
                        }
                      >
                        <p className="text-sm font-bold text-amber-950">
                          Warnings ({publishLiveCheck.warningIssues.length})
                        </p>
                        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-amber-950/85">
                          {publishLiveCheck.warningIssues.map((issue, idx) => (
                            <li key={`live-w-${idx}-${issue.message}`}>
                              <span className="font-medium">{v2SectionLabel(issue.v2Section)}:</span>{' '}
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {v2ReviewRiskFlags.length > 0 && (
                      <div className="mt-4 border-t border-amber-100 pt-4">
                        <p className="text-sm font-bold text-amber-950/90">Campaign quality signals</p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-950/85">
                          {v2ReviewRiskFlags.map((msg) => (
                            <li key={msg}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 border-t border-gray-100/90 pt-4">
                      <p className="text-sm font-semibold text-gray-900">Rough cost band (heuristic)</p>
                      {v2CostForecast ? (
                        <p className="mt-1 text-sm text-gray-700">
                          Estimated creator-facing spend range:{' '}
                          <span className="font-semibold text-nilink-ink">
                            ${v2CostForecast.minUsd.toLocaleString()} – ${v2CostForecast.maxUsd.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {' '}
                            (budget cap ${v2CostForecast.budgetCap.toLocaleString()},{' '}
                            {v2CostForecast.deliverableUnits} deliverable unit
                            {v2CostForecast.deliverableUnits === 1 ? '' : 's'})
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-500">
                          Set a positive budget cap to see a rough spend band from your brief.
                        </p>
                      )}
                    </div>
                    <div className="mt-6 border-t border-gray-100/90 pt-4">
                      <p className="text-sm font-semibold text-gray-900">Save as reusable template</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Saves the current brief defaults from this campaign (requires a saved draft / campaign id).
                      </p>
                      <div className="mt-3 grid max-w-lg gap-2">
                        <input
                          value={templateSaveName}
                          onChange={(e) => setTemplateSaveName(e.target.value)}
                          placeholder="Template name"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                        <textarea
                          value={templateSaveDesc}
                          onChange={(e) => setTemplateSaveDesc(e.target.value)}
                          placeholder="Optional description"
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveAsTemplate()}
                          disabled={templateSaveBusy || busy}
                          className="inline-flex max-w-xs items-center justify-center rounded-lg border border-nilink-accent-border bg-nilink-accent-soft/40 px-4 py-2 text-sm font-bold text-nilink-accent transition hover:bg-nilink-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {templateSaveBusy ? 'Saving…' : 'Save as template'}
                        </button>
                        {templateSaveFeedback && (
                          <p className="text-xs font-medium text-gray-700">{templateSaveFeedback}</p>
                        )}
                      </div>
                    </div>
                </div>

                <div className="rounded-lg border border-nilink-accent-border/70 bg-nilink-accent-soft/25 px-5 py-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-nilink-accent">
                    Match preview
                  </p>
                  {!campaignId && (
                    <p className="text-sm text-gray-600">
                      Save a draft first to create a campaign id. Then we can load an estimated athlete range
                      from the server.
                    </p>
                  )}
                  {campaignId && previewLoading && (
                    <p className="text-sm text-gray-500">Loading match estimate…</p>
                  )}
                  {campaignId && previewError && (
                    <p className="text-sm text-red-700">{previewError}</p>
                  )}
                  {campaignId && previewData && (
                    <div className="space-y-3" data-preview-age-tick={previewAgeTick}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-bold text-nilink-ink">
                          {matchPreviewStatusLabel(previewData.status)}
                        </p>
                        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-nilink-accent focus:ring-nilink-accent"
                              checked={previewAutoRefresh}
                              onChange={(e) => setPreviewAutoRefresh(e.target.checked)}
                            />
                            Auto-refresh
                          </label>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <span className="shrink-0 font-semibold">Every</span>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={previewAutoRefreshMinutes}
                              disabled={!previewAutoRefresh}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isFinite(v)) return;
                                setPreviewAutoRefreshMinutes(Math.min(60, Math.max(1, Math.round(v))));
                              }}
                              className="w-14 rounded border border-gray-200 px-1.5 py-1 text-center text-xs font-bold disabled:bg-gray-100 disabled:text-gray-400"
                              aria-label="Auto-refresh interval in minutes"
                            />
                            <span className="shrink-0">min</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleMatchPreviewRefresh}
                            disabled={previewLoading}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-nilink-accent-border bg-white px-3 py-1.5 text-xs font-bold text-nilink-accent shadow-sm transition hover:bg-nilink-accent-soft/50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${previewLoading ? 'animate-spin' : ''}`} />
                            Refresh estimate
                          </button>
                        </div>
                      </div>
                      {(() => {
                        const staleAfterMs =
                          typeof previewData.staleAfterMs === 'number' &&
                          Number.isFinite(previewData.staleAfterMs) &&
                          previewData.staleAfterMs > 0
                            ? previewData.staleAfterMs
                            : MATCH_PREVIEW_DEFAULT_STALE_AFTER_MS;
                        const nowMs = Date.now();
                        const timeStale =
                          typeof previewData.computedAt === 'string' &&
                          isMatchPreviewStale(previewData.computedAt, staleAfterMs, nowMs);
                        const isStale = previewData.status === 'stale' || timeStale;
                        return isStale && previewData.status !== 'refreshing' ? (
                          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                            Stale
                            {previewData.computedAt ? (
                              <>
                                {' '}
                                · {formatEstimateAgeShort(previewData.computedAt, nowMs)}
                              </>
                            ) : null}
                            {previewData.staleness?.strategy ? (
                              <span className="mt-1 block font-normal text-amber-800/90">
                                Rule: {previewData.staleness.strategy} (age of{' '}
                                {previewData.staleness.referenceField ?? 'computedAt'} ≥{' '}
                                {Math.round(staleAfterMs / 1000)}s)
                              </span>
                            ) : null}
                          </p>
                        ) : null;
                      })()}
                      {previewData.status !== 'refreshing' && (
                        <p className="text-2xl font-black text-nilink-ink">
                          {previewData.range.min.toLocaleString()} – {previewData.range.max.toLocaleString()}{' '}
                          <span className="text-sm font-semibold text-gray-500">athletes (est.)</span>
                        </p>
                      )}
                      {(previewData.confidence || previewData.confidenceScore != null) && (
                        <p className="text-xs text-gray-500">
                          {previewData.confidence ? (
                            <>
                              Confidence: {previewData.confidence}
                              {previewData.confidenceScore != null
                                ? ` (${previewData.confidenceScore.toFixed(2)} score)`
                                : null}
                            </>
                          ) : previewData.confidenceScore != null ? (
                            <>Confidence score: {previewData.confidenceScore.toFixed(2)}</>
                          ) : null}
                        </p>
                      )}
                      {(previewData.inputHash || previewData.modelVersion) && (
                        <div className="rounded-lg border border-gray-100 bg-white/60 px-3 py-2 text-[11px] text-gray-600">
                          {previewData.inputHash ? (
                            <p className="break-all font-mono text-[10px] leading-relaxed">
                              <span className="font-sans font-semibold text-gray-500">Input hash: </span>
                              {previewData.inputHash}
                            </p>
                          ) : null}
                          {previewData.modelVersion ? (
                            <p className="mt-1 font-medium">
                              Model:{' '}
                              <span className="font-mono text-gray-800">{previewData.modelVersion}</span>
                            </p>
                          ) : null}
                        </div>
                      )}
                      {previewData.confidenceReason && (
                        <p className="text-xs text-gray-600">{previewData.confidenceReason}</p>
                      )}
                      {previewData.computedAt && (
                        <p className="text-xs text-gray-500">
                          Computed at: {new Date(previewData.computedAt).toLocaleString()}
                          {previewData.status !== 'refreshing' ? (
                            <>
                              {' '}
                              · Age {formatEstimateAgeShort(previewData.computedAt, Date.now())}
                            </>
                          ) : null}
                        </p>
                      )}
                      {(previewData.version || previewData.recommendedRefreshSec != null) && (
                        <p className="text-[11px] text-gray-400">
                          {previewData.version ? <>Estimator {previewData.version}</> : null}
                          {previewData.version && previewData.recommendedRefreshSec != null ? ' · ' : null}
                          {previewData.recommendedRefreshSec != null ? (
                            <>
                              Suggested manual refresh cadence: every{' '}
                              {Math.max(1, Math.round(previewData.recommendedRefreshSec / 60))} min
                            </>
                          ) : null}
                        </p>
                      )}
                      {previewData.disclaimer && (
                        <p className="text-xs text-gray-500">{previewData.disclaimer}</p>
                      )}
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200/90 bg-gray-50/40 px-4 py-3.5 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-nilink-accent focus:ring-nilink-accent"
                    checked={reviewPublishConfirmed}
                    onChange={(e) => setReviewPublishConfirmed(e.target.checked)}
                  />
                  <span>
                    I have reviewed this campaign and confirm it is accurate and ready to publish. Offer
                    terms are not included here.
                  </span>
                </label>

                <div className="border-t border-gray-100 pt-8">
                  <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <Check className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                    Compliance snapshot
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-nilink-accent-bright" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Campaign-only fields</p>
                        <p className="text-xs text-gray-500">
                          Offer terms are created later in the deal flow, not in this wizard.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-nilink-accent-bright" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Disclosure</p>
                        <p className="text-xs text-gray-500">FTC #ad expectations still apply to published
                          content.</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Marketplace flow
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Campaign {'->'} Applications {'->'} Business review/selection {'->'} Offer creation {'->'} Athlete acceptance
                    </p>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8 xl:px-10">
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1 || busy}
                className={`flex items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 ${
                  step === 1 || busy ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleSaveDraft()}
                disabled={!canSaveDraft || busy || saveDraftButtonState === 'saved'}
                className={`rounded-lg border px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 ${
                  saveDraftButtonState === 'saved'
                    ? 'cursor-not-allowed border-green-200 bg-green-50 text-green-700'
                    : canSaveDraft && !busy
                    ? 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                    : 'cursor-not-allowed border-gray-100 text-gray-300'
                }`}
              >
                {submitKind === 'draft' && !discardBusy ? 'Saving…' : saveDraftButtonState === 'saved' ? 'Saved' : 'Save draft'}
              </button>
              <button
                type="button"
                onClick={() => void handleDiscardOrAbandon()}
                disabled={busy}
                className={`rounded-lg border px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 ${
                  !busy
                    ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                    : 'cursor-not-allowed border-gray-100 text-gray-300'
                }`}
              >
                {discardBusy ? 'Discarding…' : campaignId ? 'Discard draft' : 'Discard'}
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {step < STEP_COUNT ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed() || busy}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 ${
                    canProceed() && !busy
                      ? 'bg-gray-900 hover:bg-gray-800'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={!canPublish || busy}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 ${
                    canPublish && !busy
                      ? 'bg-gray-900 hover:bg-gray-800'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                >
                  <Zap className="h-4 w-4 shrink-0" aria-hidden />
                  {submitKind === 'publish' ? 'Publishing…' : 'Launch campaign'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
