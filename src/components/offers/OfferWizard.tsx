'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Layers,
  ListChecks,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { COPY_SEND_OFFER } from '@/lib/productCopy';
import {
  OFFER_STRUCTURED_DRAFT_VERSION,
  applyPresetToWizard,
  buildAssembledOfferOutput,
  emptyOfferWizardState,
  normalizeStructuredDraft,
  prefillWizardFromCampaignHandoff,
  prefillWizardFromChatNegotiated,
  prefillWizardFromDirectProfile,
  type OfferDealType,
  type OfferStructuredDraft,
  type OfferWizardPresetId,
  type OfferWizardState,
} from '@/lib/campaigns/offerWizardTypes';

const STEP_LABELS = [
  'Presets',
  'Basics',
  'Deal specifics',
  'Content & revisions',
  'Sourcing',
  'Review',
] as const;

const STEP_HELP: Record<(typeof STEP_LABELS)[number], string> = {
  Presets: 'Pick a starting point — optional, saves time on the next steps.',
  Basics: 'Name the offer, choose the deal type, and add any context.',
  'Deal specifics': 'Spell out the scope so the athlete knows exactly what is expected.',
  'Content & revisions': 'Set approval and iteration rules to protect the brand.',
  Sourcing: 'Exclusivity and negotiation posture for this offer.',
  Review: 'Confirm everything, then send the offer to the athlete.',
};

const PRESETS: {
  id: OfferWizardPresetId;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { id: 'scratch', label: 'Start blank', hint: 'Build from a clean slate', icon: Layers },
  { id: 'ugc_social_bundle', label: 'UGC social bundle', hint: 'Short-form video mix', icon: Video },
  { id: 'ugc_photo_set', label: 'UGC photo set', hint: 'Still photo assets', icon: Camera },
  { id: 'appearance_event', label: 'Event appearance', hint: 'In-person presence', icon: CalendarCheck },
  { id: 'appearance_media_day', label: 'Media day', hint: 'Hybrid-friendly shoot', icon: ImageIcon },
];

const UGC_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'X / Twitter'] as const;

function humanizeToken(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function readableOrigin(value: ApiOfferRow['offerOrigin'] | undefined): string {
  if (!value) return 'Offer draft';
  if (value === 'campaign_handoff') return 'Campaign handoff';
  if (value === 'direct_profile') return 'Direct profile outreach';
  return 'Chat-negotiated offer';
}

function FieldRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const display =
    typeof value === 'boolean'
      ? value
        ? 'Yes'
        : 'No'
      : value === null || value === undefined || String(value).trim() === ''
        ? 'Not set'
        : String(value);

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3.5 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{display}</p>
    </div>
  );
}

/** Reusable, prettier field label/wrapper for inputs and selects. */
function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

/** Shared classes for inputs/selects/textareas — single source of truth. */
const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-[0_1px_0_rgba(15,23,42,0.02)] outline-none transition-colors focus:border-nilink-accent focus-visible:ring-2 focus-visible:ring-nilink-accent/30';

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-nilink-accent-soft text-nilink-accent">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="text-sm font-bold text-nilink-ink">{title}</p>
      </div>
      {children}
    </div>
  );
}

type ApiOfferRow = {
  id: string;
  offerOrigin: 'campaign_handoff' | 'direct_profile' | 'chat_negotiated';
  campaignId: string | null;
  applicationId: string | null;
  athleteUserId: string;
  brandUserId: string;
  status: string;
  notes?: string;
  structuredDraft?: Record<string, unknown>;
};

type LoadPayload = {
  offer: ApiOfferRow;
  readOnlyContext: {
    campaignName?: string;
    campaignBrief?: string;
    athleteUserId?: string;
    athleteSnapshot?: {
      name?: string;
      sport?: string;
      school?: string;
    };
    chatThreadId?: string | null;
  };
};

function mergeServerDraft(
  offer: ApiOfferRow,
  ctx: LoadPayload['readOnlyContext']
): OfferStructuredDraft {
  const normalized = normalizeStructuredDraft(offer.structuredDraft);
  if (normalized) {
    return {
      ...normalized,
      originContext: normalized.originContext ?? {
        offerOrigin: offer.offerOrigin,
        campaignId: offer.campaignId,
        applicationId: offer.applicationId,
        athleteUserId: offer.athleteUserId,
        chatThreadId: ctx.chatThreadId ?? null,
      },
    };
  }

  let wizard = emptyOfferWizardState();
  const athleteName = ctx.athleteSnapshot?.name?.trim() || 'Athlete';
  if (offer.offerOrigin === 'campaign_handoff') {
    wizard = prefillWizardFromCampaignHandoff(wizard, {
      campaignName: ctx.campaignName || 'Campaign',
      campaignBrief: ctx.campaignBrief || '',
      athleteName,
    });
  } else if (offer.offerOrigin === 'direct_profile') {
    wizard = prefillWizardFromDirectProfile(wizard, { athleteName });
  } else {
    wizard = prefillWizardFromChatNegotiated(wizard, {
      chatThreadId: ctx.chatThreadId ?? undefined,
      athleteName,
    });
  }

  return {
    version: OFFER_STRUCTURED_DRAFT_VERSION,
    wizard,
    originContext: {
      offerOrigin: offer.offerOrigin,
      campaignId: offer.campaignId,
      applicationId: offer.applicationId,
      athleteUserId: offer.athleteUserId,
      chatThreadId: ctx.chatThreadId ?? null,
    },
  };
}

type Props = {
  offerId: string;
  onClose: () => void;
  /** Called after successful wizard submit (structured draft persisted). */
  onSubmitted?: () => void;
};

export function OfferWizard({ offerId, onClose, onSubmitted }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [offer, setOffer] = useState<ApiOfferRow | null>(null);
  const [draft, setDraft] = useState<OfferStructuredDraft | null>(null);
  const [headerCtx, setHeaderCtx] = useState<LoadPayload['readOnlyContext']>({});
  const [submittedBanner, setSubmittedBanner] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const flushSave = useCallback(
    async (nextDraft: OfferStructuredDraft, notes?: string): Promise<boolean> => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await authFetch(`/api/offers/${offerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredDraft: nextDraft,
            ...(notes !== undefined ? { notes } : {}),
          }),
        });
        const data = (await res.json()) as { error?: string; offer?: ApiOfferRow };
        if (!res.ok) {
          setSaveError(data.error || 'Could not save draft');
          return false;
        }
        if (data.offer) setOffer(data.offer);
        setSavedTick(true);
        window.setTimeout(() => setSavedTick(false), 1400);
        return true;
      } catch {
        setSaveError('Network error while saving');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [offerId]
  );

  const scheduleSave = useCallback(
    (nextDraft: OfferStructuredDraft) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave(nextDraft);
      }, 650);
    },
    [flushSave]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await authFetch(`/api/offers/${offerId}`);
        const data = (await res.json()) as { error?: string } & Partial<LoadPayload>;
        if (cancelled) return;
        if (!res.ok || !data.offer) {
          setLoadError(data.error || 'Could not load offer');
          return;
        }
        setOffer(data.offer);
        setHeaderCtx(data.readOnlyContext ?? {});
        setDraft(mergeServerDraft(data.offer, data.readOnlyContext ?? {}));
      } catch {
        if (!cancelled) setLoadError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [offerId]);

  useEffect(() => {
    const t = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [offerId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const updateWizard = useCallback(
    (fn: (w: OfferWizardState) => OfferWizardState) => {
      setDraft((prev) => {
        if (!prev || !offer) return prev;
        const wizard = fn(prev.wizard);
        const next: OfferStructuredDraft = {
          ...prev,
          wizard: { ...wizard, lastVisitedStep: Math.max(wizard.lastVisitedStep, step) },
          originContext: prev.originContext ?? {
            offerOrigin: offer.offerOrigin,
            campaignId: offer.campaignId,
            applicationId: offer.applicationId,
            athleteUserId: offer.athleteUserId,
            chatThreadId: null,
          },
        };
        scheduleSave(next);
        return next;
      });
    },
    [offer, scheduleSave, step]
  );

  const canAdvance = useMemo(() => {
    if (!draft) return false;
    const { basics } = draft.wizard;
    if (step === 1) {
      return basics.offerName.trim().length >= 2 && basics.dealType.length > 0;
    }
    if (step === 2) {
      if (basics.dealType === 'ugc') {
        return draft.wizard.ugc.primaryPlatforms.length > 0 && draft.wizard.ugc.assetCount >= 1;
      }
      return draft.wizard.appearance.eventOrSeriesName.trim().length >= 2;
    }
    if (step === 3) {
      return draft.wizard.contentControl.revisionRounds >= 0;
    }
    if (step === 4) {
      return true;
    }
    return true;
  }, [draft, step]);

  const goNext = () => {
    if (step < STEP_LABELS.length - 1) {
      updateWizard((w) => ({ ...w, lastVisitedStep: Math.max(w.lastVisitedStep, step + 1) }));
      setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
    }
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!draft || !offer) return;
    const submittedAt = new Date().toISOString();
    const assembled = buildAssembledOfferOutput({
      offerId: offer.id,
      offerOrigin: offer.offerOrigin,
      campaignId: offer.campaignId,
      applicationId: offer.applicationId,
      athleteUserId: offer.athleteUserId,
      brandUserId: offer.brandUserId,
      structuredDraft: draft,
    });
    const next: OfferStructuredDraft = {
      ...draft,
      meta: { submitted: true, submittedAt },
      assembled: { ...assembled, submittedAt },
    };
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveError(null);
    const ok = await flushSave(next);
    if (!ok) return;
    setDraft(next);

    const sendRes = await authFetch(`/api/offers/${offerId}/send`, { method: 'POST' });
    const sendData = (await sendRes.json()) as { error?: string; offer?: ApiOfferRow };
    if (!sendRes.ok || !sendData.offer) {
      setSaveError(
        sendData.error ||
          'Offer terms were saved, but sending failed. Try sending again from Dashboard → Offers.',
      );
      return;
    }
    setOffer(sendData.offer);
    setSubmittedBanner(true);
    trackAnalyticsEvent('offer_submit', {
      offerId: offer.id,
      offerOrigin: offer.offerOrigin,
      campaignId: offer.campaignId ?? undefined,
    });
    trackAnalyticsEvent('offer_send', {
      offerId: offer.id,
      offerOrigin: offer.offerOrigin,
      campaignId: offer.campaignId ?? undefined,
    });
    onSubmitted?.();
  };

  const progressPct = Math.round(((step + 1) / STEP_LABELS.length) * 100);
  const currentStepLabel = STEP_LABELS[step];
  const athleteName = headerCtx.athleteSnapshot?.name?.trim();
  const athleteMeta = [headerCtx.athleteSnapshot?.sport, headerCtx.athleteSnapshot?.school]
    .filter(Boolean)
    .join(' · ');

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="presentation"
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-wizard-title"
          aria-describedby="offer-wizard-desc"
          className="flex max-h-[min(94dvh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)] sm:max-h-[min(94vh,920px)] sm:rounded-3xl"
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          {/* HEADER — gradient band with context chips */}
          <div className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-br from-nilink-accent-soft via-white to-white px-5 py-5 sm:px-7 sm:py-6">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-nilink-accent/10 blur-3xl" aria-hidden />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-nilink-accent-border bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-nilink-accent backdrop-blur">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Offer draft
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                    · {readableOrigin(offer?.offerOrigin)}
                  </span>
                </div>
                <h2
                  id="offer-wizard-title"
                  className="mt-2 text-xl font-black tracking-tight text-nilink-ink sm:text-2xl"
                >
                  {COPY_SEND_OFFER}
                </h2>
                <p id="offer-wizard-desc" className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
                  Walk through each section. We autosave as you go — when you submit, terms are sent to
                  the athlete in a clean, readable summary.
                </p>

                {/* Context chips: campaign + athlete */}
                {(headerCtx.campaignName || athleteName) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {headerCtx.campaignName ? (
                      <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                        <Building2 className="h-3.5 w-3.5 text-nilink-accent" aria-hidden />
                        <span className="truncate">{headerCtx.campaignName}</span>
                      </span>
                    ) : null}
                    {athleteName ? (
                      <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                        <User className="h-3.5 w-3.5 text-nilink-accent" aria-hidden />
                        <span className="truncate">
                          {athleteName}
                          {athleteMeta ? (
                            <span className="ml-1 font-normal text-gray-500">· {athleteMeta}</span>
                          ) : null}
                        </span>
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl p-2 text-gray-500 outline-none transition-colors hover:bg-white hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-nilink-accent"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {/* Mobile horizontal stepper */}
            <div className="relative mt-5 lg:hidden">
              <div className="flex items-center justify-between gap-1" role="tablist" aria-label={`${COPY_SEND_OFFER} steps`}>
                {STEP_LABELS.map((label, i) => {
                  const on = i === step;
                  const done = draft ? draft.wizard.lastVisitedStep > i : false;
                  return (
                    <button
                      key={label}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      aria-current={on ? 'step' : undefined}
                      onClick={() => setStep(i)}
                      className="group flex flex-1 flex-col items-center gap-1 outline-none"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                          on
                            ? 'bg-nilink-accent text-white shadow-sm ring-4 ring-nilink-accent/15'
                            : done
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                        }`}
                      >
                        {done && !on ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span
                        className={`max-w-[68px] truncate text-[10px] font-semibold uppercase tracking-wide ${
                          on ? 'text-nilink-accent' : 'text-gray-500'
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BODY — desktop two-pane, mobile single column */}
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Desktop vertical stepper rail */}
            <aside
              className="hidden border-r border-gray-100 bg-gray-50/60 p-4 lg:block"
              role="tablist"
              aria-label={`${COPY_SEND_OFFER} steps`}
            >
              <p className="px-2 pb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                Steps
              </p>
              <ol className="relative space-y-0.5">
                <span
                  aria-hidden
                  className="absolute left-[22px] top-2 bottom-2 w-px bg-gray-200"
                />
                {STEP_LABELS.map((label, i) => {
                  const on = i === step;
                  const done = draft ? draft.wizard.lastVisitedStep > i : false;
                  return (
                    <li key={label} className="relative">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={on}
                        aria-current={on ? 'step' : undefined}
                        onClick={() => setStep(i)}
                        className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-nilink-accent ${
                          on ? 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]' : 'hover:bg-white/60'
                        }`}
                      >
                        <span
                          className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                            on
                              ? 'bg-nilink-accent text-white ring-4 ring-nilink-accent/15'
                              : done
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white text-gray-500 ring-1 ring-gray-200 group-hover:ring-gray-300'
                          }`}
                        >
                          {done && !on ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm font-semibold ${
                              on ? 'text-nilink-ink' : 'text-gray-700'
                            }`}
                          >
                            {label}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </aside>

            {/* Right pane content */}
            <div className="min-h-0 overflow-y-auto">
              {/* Step heading */}
              {!loading && !loadError && (
                <div className="border-b border-gray-50 bg-white px-5 py-4 sm:px-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-nilink-accent">
                    Step {step + 1} of {STEP_LABELS.length}
                  </p>
                  <h3 className="mt-0.5 text-lg font-bold text-nilink-ink">{currentStepLabel}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">{STEP_HELP[currentStepLabel]}</p>
                </div>
              )}

              <div className="px-5 py-5 sm:px-7 sm:py-6">
                {loading && (
                  <div
                    className="flex items-center gap-2 py-16 text-sm text-gray-500"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    Loading offer…
                  </div>
                )}
                {loadError && (
                  <p className="py-12 text-center text-sm text-red-600" role="alert">
                    {loadError}
                  </p>
                )}
                {!loading && !loadError && draft && (
                  <div className="space-y-6 pb-2">
                    {/* STEP 0 — PRESETS */}
                    {step === 0 && (
                      <section className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {PRESETS.map((p) => {
                            const selected = draft.wizard.presetId === p.id;
                            const Icon = p.icon;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() =>
                                  updateWizard((w) => applyPresetToWizard({ ...w, presetId: p.id }, p.id))
                                }
                                className={`group relative flex items-start gap-3 rounded-2xl border bg-white p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent ${
                                  selected
                                    ? 'border-nilink-accent shadow-[0_4px_12px_-4px_rgba(42,144,176,0.35)] ring-1 ring-nilink-accent'
                                    : 'border-gray-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm'
                                }`}
                              >
                                <span
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                    selected
                                      ? 'bg-nilink-accent text-white'
                                      : 'bg-nilink-accent-soft text-nilink-accent group-hover:bg-nilink-accent/10'
                                  }`}
                                >
                                  <Icon className="h-5 w-5" aria-hidden />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-nilink-ink">{p.label}</p>
                                  <p className="mt-0.5 text-xs text-gray-500">{p.hint}</p>
                                </div>
                                {selected && (
                                  <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-nilink-accent text-white">
                                    <Check className="h-3 w-3" aria-hidden />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-400">
                          Presets just pre-fill the next steps — you can change anything later.
                        </p>
                      </section>
                    )}

                    {/* STEP 1 — BASICS */}
                    {step === 1 && (
                      <section className="space-y-5">
                        <Field label="Offer name" htmlFor="of-name">
                          <input
                            id="of-name"
                            className={inputClass}
                            value={draft.wizard.basics.offerName}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                basics: { ...w.basics, offerName: e.target.value },
                              }))
                            }
                            placeholder="e.g. Spring social UGC package"
                          />
                        </Field>

                        <div>
                          <p className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                            Deal type
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {(['ugc', 'appearance'] as OfferDealType[]).map((t) => {
                              const active = draft.wizard.basics.dealType === t;
                              const Icon = t === 'ugc' ? Video : CalendarCheck;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() =>
                                    updateWizard((w) => ({ ...w, basics: { ...w.basics, dealType: t } }))
                                  }
                                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent ${
                                    active
                                      ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent shadow-sm'
                                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" aria-hidden />
                                  <span className="capitalize">{t === 'ugc' ? 'UGC content' : 'Appearance'}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Due date" hint="Optional" htmlFor="of-due">
                            <input
                              id="of-due"
                              type="date"
                              className={inputClass}
                              value={draft.wizard.basics.dueDate}
                              onChange={(e) =>
                                updateWizard((w) => ({
                                  ...w,
                                  basics: { ...w.basics, dueDate: e.target.value },
                                }))
                              }
                            />
                          </Field>
                          <Field label="Compensation hint" hint="Non-binding until deal execution" htmlFor="of-amt">
                            <input
                              id="of-amt"
                              className={inputClass}
                              placeholder="e.g. $2,500 flat"
                              value={draft.wizard.basics.amount ?? ''}
                              onChange={(e) =>
                                updateWizard((w) => ({
                                  ...w,
                                  basics: { ...w.basics, amount: e.target.value },
                                }))
                              }
                            />
                          </Field>
                        </div>

                        <Field label="Details" htmlFor="of-details">
                          <textarea
                            id="of-details"
                            className={`${inputClass} min-h-[120px] resize-y leading-relaxed`}
                            placeholder="What is this offer about? Goals, vibe, do's and don'ts…"
                            value={draft.wizard.basics.details}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                basics: { ...w.basics, details: e.target.value },
                              }))
                            }
                          />
                        </Field>
                      </section>
                    )}

                    {/* STEP 2 — DEAL SPECIFICS — UGC */}
                    {step === 2 && draft.wizard.basics.dealType === 'ugc' && (
                      <section className="space-y-5">
                        <div>
                          <p className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                            Platforms
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {UGC_PLATFORMS.map((p) => {
                              const on = draft.wizard.ugc.primaryPlatforms.includes(p);
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() =>
                                    updateWizard((w) => {
                                      const set = new Set(w.ugc.primaryPlatforms);
                                      if (set.has(p)) set.delete(p);
                                      else set.add(p);
                                      return {
                                        ...w,
                                        ugc: { ...w.ugc, primaryPlatforms: Array.from(set) },
                                      };
                                    })
                                  }
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent ${
                                    on
                                      ? 'border-nilink-accent bg-nilink-accent text-white shadow-sm'
                                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                  }`}
                                >
                                  {on && <Check className="h-3 w-3" aria-hidden />}
                                  {p}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Asset count" htmlFor="of-assets">
                            <input
                              id="of-assets"
                              type="number"
                              min={1}
                              className={inputClass}
                              value={draft.wizard.ugc.assetCount}
                              onChange={(e) =>
                                updateWizard((w) => ({
                                  ...w,
                                  ugc: { ...w.ugc, assetCount: Math.max(1, Number(e.target.value) || 1) },
                                }))
                              }
                            />
                          </Field>
                          <Field label="Organic usage (months)" htmlFor="of-org">
                            <input
                              id="of-org"
                              type="number"
                              min={0}
                              className={inputClass}
                              value={draft.wizard.ugc.organicUsageMonths}
                              onChange={(e) =>
                                updateWizard((w) => ({
                                  ...w,
                                  ugc: {
                                    ...w.ugc,
                                    organicUsageMonths: Math.max(0, Number(e.target.value) || 0),
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>

                        <Field label="Hooks / talking points" htmlFor="of-hooks">
                          <textarea
                            id="of-hooks"
                            className={`${inputClass} min-h-[88px] resize-y leading-relaxed`}
                            placeholder="What should the athlete emphasize?"
                            value={draft.wizard.ugc.hookOrTalkingPoints}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                ugc: { ...w.ugc, hookOrTalkingPoints: e.target.value },
                              }))
                            }
                          />
                        </Field>

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300">
                          <input
                            type="checkbox"
                            checked={draft.wizard.ugc.paidAdsAllowed}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                ugc: { ...w.ugc, paidAdsAllowed: e.target.checked },
                              }))
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-nilink-accent"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900">
                              Paid ad usage allowed
                            </span>
                            <span className="block text-xs text-gray-500">
                              Brand may boost this content as a paid ad.
                            </span>
                          </span>
                        </label>
                      </section>
                    )}

                    {/* STEP 2 — DEAL SPECIFICS — APPEARANCE */}
                    {step === 2 && draft.wizard.basics.dealType === 'appearance' && (
                      <section className="space-y-5">
                        <Field label="Event or series name" htmlFor="of-evt">
                          <input
                            id="of-evt"
                            className={inputClass}
                            placeholder="e.g. Summer launch dinner"
                            value={draft.wizard.appearance.eventOrSeriesName}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                appearance: { ...w.appearance, eventOrSeriesName: e.target.value },
                              }))
                            }
                          />
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Format" htmlFor="of-format">
                            <select
                              id="of-format"
                              className={inputClass}
                              value={draft.wizard.appearance.appearanceFormat}
                              onChange={(e) =>
                                updateWizard((w) => ({
                                  ...w,
                                  appearance: {
                                    ...w.appearance,
                                    appearanceFormat: e.target.value as OfferWizardState['appearance']['appearanceFormat'],
                                  },
                                }))
                              }
                            >
                              <option value="in_person">In person</option>
                              <option value="virtual">Virtual</option>
                              <option value="hybrid">Hybrid</option>
                            </select>
                          </Field>
                          <Field label="Estimated hours" htmlFor="of-hours">
                            <input
                              id="of-hours"
                              className={inputClass}
                              placeholder="e.g. 3"
                              value={draft.wizard.appearance.estimatedHours}
                              onChange={(e) =>
                                updateWizard((w) => ({
                                  ...w,
                                  appearance: { ...w.appearance, estimatedHours: e.target.value },
                                }))
                              }
                            />
                          </Field>
                        </div>

                        <Field label="Travel" htmlFor="of-travel">
                          <select
                            id="of-travel"
                            className={inputClass}
                            value={draft.wizard.appearance.travelIncluded}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                appearance: {
                                  ...w.appearance,
                                  travelIncluded: e.target.value as OfferWizardState['appearance']['travelIncluded'],
                                },
                              }))
                            }
                          >
                            <option value="included">Included in fee</option>
                            <option value="reimbursed">Reimbursed separately</option>
                            <option value="not_covered">Not covered</option>
                          </select>
                        </Field>

                        <Field label="Wardrobe / look notes" htmlFor="of-ward">
                          <textarea
                            id="of-ward"
                            className={`${inputClass} min-h-[88px] resize-y leading-relaxed`}
                            placeholder="Dress code, brand colors, restrictions…"
                            value={draft.wizard.appearance.wardrobeNotes}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                appearance: { ...w.appearance, wardrobeNotes: e.target.value },
                              }))
                            }
                          />
                        </Field>
                      </section>
                    )}

                    {/* STEP 3 — CONTENT & REVISIONS */}
                    {step === 3 && (
                      <section className="space-y-5">
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300">
                          <input
                            type="checkbox"
                            checked={draft.wizard.contentControl.brandApprovalRequired}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                contentControl: {
                                  ...w.contentControl,
                                  brandApprovalRequired: e.target.checked,
                                },
                              }))
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-nilink-accent"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900">
                              Brand approval required before posting
                            </span>
                            <span className="block text-xs text-gray-500">
                              Athlete must get sign-off before publishing on their channels.
                            </span>
                          </span>
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Included revision rounds" htmlFor="of-rev">
                            <input
                              id="of-rev"
                              type="number"
                              min={0}
                              className={inputClass}
                              value={draft.wizard.contentControl.revisionRounds}
                              onChange={(e) =>
                                updateWizard((w) => ({
                                  ...w,
                                  contentControl: {
                                    ...w.contentControl,
                                    revisionRounds: Math.max(0, Number(e.target.value) || 0),
                                  },
                                }))
                              }
                            />
                          </Field>
                          <Field label="Brand response window (days)" htmlFor="of-resp">
                            <input
                              id="of-resp"
                              type="number"
                              min={1}
                              className={inputClass}
                              value={draft.wizard.contentControl.responseWindowDays}
                              onChange={(e) =>
                                updateWizard((w) => ({
                                  ...w,
                                  contentControl: {
                                    ...w.contentControl,
                                    responseWindowDays: Math.max(1, Number(e.target.value) || 1),
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>
                      </section>
                    )}

                    {/* STEP 4 — SOURCING */}
                    {step === 4 && (
                      <section className="space-y-5">
                        <Field label="Category exclusivity" htmlFor="of-excl">
                          <select
                            id="of-excl"
                            className={inputClass}
                            value={draft.wizard.sourcing.categoryExclusivity}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                sourcing: {
                                  ...w.sourcing,
                                  categoryExclusivity: e.target.value as OfferWizardState['sourcing']['categoryExclusivity'],
                                },
                              }))
                            }
                          >
                            <option value="none">None</option>
                            <option value="soft">Soft — limited overlap</option>
                            <option value="hard">Hard — blocked competitors</option>
                          </select>
                        </Field>

                        <Field
                          label="Competitor exclusions"
                          hint="Comma-separated"
                          htmlFor="of-compex"
                        >
                          <input
                            id="of-compex"
                            className={inputClass}
                            placeholder="e.g. Nike, Adidas, Puma"
                            value={draft.wizard.sourcing.competitorExclusions}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                sourcing: { ...w.sourcing, competitorExclusions: e.target.value },
                              }))
                            }
                          />
                        </Field>

                        <Field label="Negotiation style" htmlFor="of-neg">
                          <select
                            id="of-neg"
                            className={inputClass}
                            value={draft.wizard.sourcing.negotiationStyle}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                sourcing: {
                                  ...w.sourcing,
                                  negotiationStyle: e.target.value as OfferWizardState['sourcing']['negotiationStyle'],
                                },
                              }))
                            }
                          >
                            <option value="standard">Standard</option>
                            <option value="flexible">Flexible</option>
                            <option value="take_it_or_leave_it">Firm — take it or leave it</option>
                          </select>
                        </Field>

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300">
                          <input
                            type="checkbox"
                            checked={draft.wizard.sourcing.allowCounterTerms}
                            onChange={(e) =>
                              updateWizard((w) => ({
                                ...w,
                                sourcing: { ...w.sourcing, allowCounterTerms: e.target.checked },
                              }))
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-nilink-accent"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900">
                              Allow athlete counter-terms
                            </span>
                            <span className="block text-xs text-gray-500">
                              Athlete can propose changes instead of just accept/decline.
                            </span>
                          </span>
                        </label>
                      </section>
                    )}

                    {/* STEP 5 — REVIEW */}
                    {step === 5 && (
                      <section className="space-y-4 text-sm text-gray-700">
                        <div className="rounded-2xl border border-nilink-accent-border bg-gradient-to-br from-nilink-accent-soft to-white p-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-nilink-accent shadow-sm">
                              <Sparkles className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-nilink-accent">
                                Final review
                              </p>
                              <h3 className="mt-1 text-xl font-black leading-tight text-nilink-ink">
                                {draft.wizard.basics.offerName || 'Untitled offer'}
                              </h3>
                              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                                Confirm everything below. When you submit, the athlete sees this offer
                                in a clean, readable summary.
                              </p>
                            </div>
                          </div>
                        </div>

                        <SectionCard icon={ListChecks} title="Offer overview">
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <FieldRow label="Offer type" value={humanizeToken(draft.wizard.basics.dealType)} />
                            <FieldRow label="Source" value={readableOrigin(offer?.offerOrigin)} />
                            <FieldRow label="Due date" value={draft.wizard.basics.dueDate} />
                            <FieldRow label="Compensation hint" value={draft.wizard.basics.amount} />
                          </div>
                        </SectionCard>

                        <SectionCard icon={FileText} title="Offer details">
                          <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3.5 text-sm leading-relaxed text-gray-700">
                            {draft.wizard.basics.details?.trim() || 'No extra notes added.'}
                          </p>
                        </SectionCard>

                        {draft.wizard.basics.dealType === 'ugc' ? (
                          <SectionCard icon={Video} title="Content package">
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              <FieldRow
                                label="Platforms"
                                value={
                                  draft.wizard.ugc.primaryPlatforms.length
                                    ? draft.wizard.ugc.primaryPlatforms.join(', ')
                                    : 'Not set'
                                }
                              />
                              <FieldRow label="Asset count" value={draft.wizard.ugc.assetCount} />
                              <FieldRow label="Organic usage" value={`${draft.wizard.ugc.organicUsageMonths} months`} />
                              <FieldRow label="Paid ads allowed" value={draft.wizard.ugc.paidAdsAllowed} />
                            </div>
                            <div className="mt-2.5">
                              <FieldRow label="Hooks or talking points" value={draft.wizard.ugc.hookOrTalkingPoints} />
                            </div>
                          </SectionCard>
                        ) : (
                          <SectionCard icon={CalendarDays} title="Appearance details">
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              <FieldRow label="Event or series" value={draft.wizard.appearance.eventOrSeriesName} />
                              <FieldRow
                                label="Format"
                                value={humanizeToken(draft.wizard.appearance.appearanceFormat)}
                              />
                              <FieldRow label="Estimated hours" value={draft.wizard.appearance.estimatedHours} />
                              <FieldRow label="Travel" value={humanizeToken(draft.wizard.appearance.travelIncluded)} />
                            </div>
                            <div className="mt-2.5">
                              <FieldRow label="Wardrobe or look notes" value={draft.wizard.appearance.wardrobeNotes} />
                            </div>
                          </SectionCard>
                        )}

                        <div className="grid gap-3 lg:grid-cols-2">
                          <SectionCard icon={ShieldCheck} title="Approval rules">
                            <div className="space-y-2.5">
                              <FieldRow
                                label="Brand approval required"
                                value={draft.wizard.contentControl.brandApprovalRequired}
                              />
                              <FieldRow label="Revision rounds" value={draft.wizard.contentControl.revisionRounds} />
                              <FieldRow
                                label="Response window"
                                value={`${draft.wizard.contentControl.responseWindowDays} days`}
                              />
                            </div>
                          </SectionCard>

                          <SectionCard icon={DollarSign} title="Negotiation terms">
                            <div className="space-y-2.5">
                              <FieldRow
                                label="Exclusivity"
                                value={humanizeToken(draft.wizard.sourcing.categoryExclusivity)}
                              />
                              <FieldRow
                                label="Competitor exclusions"
                                value={draft.wizard.sourcing.competitorExclusions}
                              />
                              <FieldRow
                                label="Negotiation style"
                                value={humanizeToken(draft.wizard.sourcing.negotiationStyle)}
                              />
                              <FieldRow
                                label="Counter terms allowed"
                                value={draft.wizard.sourcing.allowCounterTerms}
                              />
                            </div>
                          </SectionCard>
                        </div>

                        {draft.meta?.submitted && (
                          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="text-sm font-semibold">
                              Submitted {new Date(draft.meta.submittedAt!).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FOOTER — progress + autosave + nav */}
          <div className="border-t border-gray-100 bg-white px-5 py-3.5 sm:px-7">
            {/* Progress bar */}
            <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-nilink-accent-bright to-nilink-accent"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 30 }}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex min-h-6 flex-wrap items-center gap-2 text-xs text-gray-500">
                {saving && (
                  <span className="inline-flex items-center gap-1.5" role="status" aria-live="polite">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Saving…
                  </span>
                )}
                {!saving && savedTick && !saveError && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Saved
                  </span>
                )}
                {saveError && (
                  <span className="text-red-600" role="alert">
                    {saveError}
                  </span>
                )}
                {submittedBanner && !saveError && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Offer sent — the athlete can review under their Offers tab.
                  </span>
                )}
              </div>
              <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0 || loading}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:opacity-40 sm:flex-initial"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Back
                </button>
                {step < STEP_LABELS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!draft || !canAdvance}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-nilink-accent px-5 py-2 text-sm font-bold text-white shadow-sm transition-all outline-none hover:bg-nilink-accent-hover hover:shadow focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:opacity-40 disabled:hover:shadow-sm sm:flex-initial"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!draft || saving || offer?.status !== 'draft'}
                    aria-busy={saving}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-nilink-accent to-nilink-accent-hover px-5 py-2 text-sm font-bold text-white shadow-[0_4px_12px_-4px_rgba(42,144,176,0.5)] transition-all outline-none hover:shadow-[0_6px_16px_-4px_rgba(42,144,176,0.6)] focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:opacity-40 sm:flex-initial"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Submitting…
                      </>
                    ) : submittedBanner ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Sent
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden />
                        Submit offer
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
