'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, X, CheckCircle2 } from 'lucide-react';
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

const PRESETS: { id: OfferWizardPresetId; label: string; hint: string }[] = [
  { id: 'scratch', label: 'Start blank', hint: 'No template' },
  { id: 'ugc_social_bundle', label: 'UGC social bundle', hint: 'Short-form mix' },
  { id: 'ugc_photo_set', label: 'UGC photo set', hint: 'Still assets' },
  { id: 'appearance_event', label: 'Event appearance', hint: 'In-person' },
  { id: 'appearance_media_day', label: 'Media day', hint: 'Hybrid-friendly' },
];

const UGC_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'X / Twitter'] as const;

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
  const [submittedBanner, setSubmittedBanner] = useState(false);
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

  const originLabel = offer?.offerOrigin.replace(/_/g, ' ') ?? '';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
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
          className="flex max-h-[min(92dvh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-h-[min(92vh,880px)] sm:rounded-2xl"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Offer draft · {originLabel}
              </p>
              <h2 id="offer-wizard-title" className="text-lg font-bold text-nilink-ink">
                {COPY_SEND_OFFER}
              </h2>
              <p id="offer-wizard-desc" className="mt-1 text-xs text-gray-500">
                Step through each section, then use Submit offer to save terms and send the offer to the athlete.
              </p>
              {offer && (
                <p className="mt-1 text-xs text-gray-500">
                  Athlete user: <span className="font-mono text-[11px]">{offer.athleteUserId}</span>
                  {offer.campaignId ? (
                    <>
                      {' '}
                      · Campaign: <span className="font-mono text-[11px]">{offer.campaignId}</span>
                    </>
                  ) : null}
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-gray-400 outline-none ring-nilink-accent hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="border-b border-gray-50 px-4 py-2.5 sm:px-5 sm:py-3">
            <div
              className="flex flex-wrap gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label={`${COPY_SEND_OFFER} wizard steps`}
            >
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
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors sm:px-3 sm:text-[11px] ${
                      on
                        ? 'bg-nilink-accent text-white'
                        : done
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border border-gray-100 bg-gray-50 text-gray-500'
                    } outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent`}
                  >
                    {i + 1}. {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
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
              <div className="space-y-5 pb-4">
                {step === 0 && (
                  <section className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Optional presets speed up the next steps. You can still change anything later.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            updateWizard((w) => applyPresetToWizard({ ...w, presetId: p.id }, p.id))
                          }
                          className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent ${
                            draft.wizard.presetId === p.id
                              ? 'border-nilink-accent-border bg-nilink-accent-soft text-nilink-accent'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="font-bold text-gray-900">{p.label}</span>
                          <span className="mt-0.5 block text-xs text-gray-500">{p.hint}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {step === 1 && (
                  <section className="space-y-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Offer name
                      <input
                        className="mt-1 w-full min-h-11 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent"
                        value={draft.wizard.basics.offerName}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            basics: { ...w.basics, offerName: e.target.value },
                          }))
                        }
                        placeholder="e.g. Spring social UGC package"
                      />
                    </label>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Deal type</p>
                      <div className="mt-2 flex gap-2">
                        {(['ugc', 'appearance'] as OfferDealType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              updateWizard((w) => ({ ...w, basics: { ...w.basics, dealType: t } }))
                            }
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent ${
                              draft.wizard.basics.dealType === t
                                ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent'
                                : 'border-gray-200 text-gray-600'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Due date (optional)
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={draft.wizard.basics.dueDate}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            basics: { ...w.basics, dueDate: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Details
                      <textarea
                        className="mt-1 min-h-[100px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={draft.wizard.basics.details}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            basics: { ...w.basics, details: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <details className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-600">
                      <summary className="cursor-pointer font-semibold text-gray-800">
                        Compensation hint (optional)
                      </summary>
                      <input
                        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder="e.g. $2,500 flat (non-binding until deal execution)"
                        value={draft.wizard.basics.amount ?? ''}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            basics: { ...w.basics, amount: e.target.value },
                          }))
                        }
                      />
                    </details>
                  </section>
                )}

                {step === 2 && draft.wizard.basics.dealType === 'ugc' && (
                  <section className="space-y-4">
                    <p className="text-sm text-gray-600">Define the UGC scope for this offer.</p>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Platforms</p>
                      <div className="mt-2 flex flex-wrap gap-2">
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
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                on
                                  ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent'
                                  : 'border-gray-200 text-gray-600'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Asset count
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={draft.wizard.ugc.assetCount}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            ugc: { ...w.ugc, assetCount: Math.max(1, Number(e.target.value) || 1) },
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Hooks / talking points
                      <textarea
                        className="mt-1 min-h-[72px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={draft.wizard.ugc.hookOrTalkingPoints}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            ugc: { ...w.ugc, hookOrTalkingPoints: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Organic usage (months)
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={draft.wizard.ugc.paidAdsAllowed}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            ugc: { ...w.ugc, paidAdsAllowed: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 accent-nilink-accent"
                      />
                      Paid ad usage allowed
                    </label>
                  </section>
                )}

                {step === 2 && draft.wizard.basics.dealType === 'appearance' && (
                  <section className="space-y-4">
                    <p className="text-sm text-gray-600">Appearance-specific expectations.</p>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Event or series name
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={draft.wizard.appearance.eventOrSeriesName}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            appearance: { ...w.appearance, eventOrSeriesName: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Format</p>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                    </div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Estimated hours
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={draft.wizard.appearance.estimatedHours}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            appearance: { ...w.appearance, estimatedHours: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Travel</p>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                    </div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Wardrobe / look notes
                      <textarea
                        className="mt-1 min-h-[72px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={draft.wizard.appearance.wardrobeNotes}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            appearance: { ...w.appearance, wardrobeNotes: e.target.value },
                          }))
                        }
                      />
                    </label>
                  </section>
                )}

                {step === 3 && (
                  <section className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Brand safety and iteration rules for this offer (stored on the offer draft only).
                    </p>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
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
                        className="rounded border-gray-300 accent-nilink-accent"
                      />
                      Brand approval required before posting
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Included revision rounds
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Brand response window (days)
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                    </label>
                  </section>
                )}

                {step === 4 && (
                  <section className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Sourcing and negotiation posture for this offer (does not change campaign targeting).
                    </p>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Category exclusivity
                      </p>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                        <option value="soft">Soft (limited overlap)</option>
                        <option value="hard">Hard (blocked competitors)</option>
                      </select>
                    </div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Competitor exclusions (comma-separated)
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={draft.wizard.sourcing.competitorExclusions}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            sourcing: { ...w.sourcing, competitorExclusions: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Negotiation style
                      </p>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
                        <option value="take_it_or_leave_it">Firm / take it or leave it</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={draft.wizard.sourcing.allowCounterTerms}
                        onChange={(e) =>
                          updateWizard((w) => ({
                            ...w,
                            sourcing: { ...w.sourcing, allowCounterTerms: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 accent-nilink-accent"
                      />
                      Allow athlete counter-terms
                    </label>
                  </section>
                )}

                {step === 5 && (
                  <section className="space-y-3 text-sm text-gray-700">
                    <p className="font-semibold text-nilink-ink">Review structured offer</p>
                    <ul className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-xs leading-relaxed">
                      <li>
                        <span className="font-bold text-gray-500">Name:</span> {draft.wizard.basics.offerName}
                      </li>
                      <li>
                        <span className="font-bold text-gray-500">Type:</span>{' '}
                        {draft.wizard.basics.dealType.toUpperCase()}
                      </li>
                      <li>
                        <span className="font-bold text-gray-500">Due:</span>{' '}
                        {draft.wizard.basics.dueDate || '—'}
                      </li>
                      <li>
                        <span className="font-bold text-gray-500">Amount hint:</span>{' '}
                        {draft.wizard.basics.amount?.trim() || '—'}
                      </li>
                      <li>
                        <span className="font-bold text-gray-500">Origin:</span> {offer?.offerOrigin}
                      </li>
                    </ul>
                    {draft.wizard.basics.dealType === 'ugc' ? (
                      <pre className="max-h-40 overflow-auto rounded-lg border border-gray-100 bg-white p-3 text-[11px] text-gray-600">
                        {JSON.stringify(draft.wizard.ugc, null, 2)}
                      </pre>
                    ) : (
                      <pre className="max-h-40 overflow-auto rounded-lg border border-gray-100 bg-white p-3 text-[11px] text-gray-600">
                        {JSON.stringify(draft.wizard.appearance, null, 2)}
                      </pre>
                    )}
                    <pre className="max-h-32 overflow-auto rounded-lg border border-gray-100 bg-white p-3 text-[11px] text-gray-600">
                      {JSON.stringify(
                        {
                          contentControl: draft.wizard.contentControl,
                          sourcing: draft.wizard.sourcing,
                        },
                        null,
                        2
                      )}
                    </pre>
                    {draft.meta?.submitted && (
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Submitted {draft.meta.submittedAt}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-h-6 flex-wrap items-center gap-2 text-xs text-gray-500">
              {saving && (
                <span className="inline-flex items-center gap-1" role="status" aria-live="polite">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Saving…
                </span>
              )}
              {saveError && (
                <span className="text-red-600" role="alert">
                  {saveError}
                </span>
              )}
              {submittedBanner && !saveError && (
                <span className="max-w-md text-emerald-800">
                  Offer sent. The athlete can review and respond under their Offers tab.
                </span>
              )}
            </div>
            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || loading}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:opacity-40 sm:flex-initial"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
              {step < STEP_LABELS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!draft || !canAdvance}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-nilink-accent px-4 py-2 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:opacity-40 sm:flex-initial"
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
                  className="min-h-11 flex-1 rounded-lg bg-nilink-accent px-4 py-2 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:opacity-40 sm:flex-initial"
                >
                  {saving ? 'Submitting…' : submittedBanner ? 'Sent' : 'Submit offer'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
