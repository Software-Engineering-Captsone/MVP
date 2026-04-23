'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { authFetch } from '@/lib/authFetch';
import {
  createDeliverableSubmission,
  fetchDealDetail,
  fetchDealsList,
  fetchSubmissionsForDeliverable,
  formatIsoDate,
  formatShortId,
  humanizeDealStatus,
  compensationAmountFromDealSnapshot,
  parseTermsSnapshot,
  patchContractStatus,
  type ApiDeal,
  type ApiDealDetail,
  type ApiSubmission,
} from '@/lib/deals/dashboardDealsClient';
import {
  buildDealStageProjection,
  buildDeliverableProjection,
  contractStatusCopy,
  filterMainTimelineActivities,
  stageProgress,
  STAGE_ORDER,
} from '@/lib/deals/stageProjection';

type ListTab = 'open' | 'done';
type AthleteDealSection = 'needs_action' | 'awaiting_review' | 'in_progress' | 'completed';

function isDoneDeal(d: ApiDeal): boolean {
  return d.status === 'paid' || d.status === 'closed' || d.status === 'cancelled';
}

function nextOwnerLabel(owner: ApiDeal['nextActionOwner']): string {
  if (owner === 'brand') return 'Brand';
  if (owner === 'athlete') return 'You (athlete)';
  if (owner === 'system') return 'System';
  return '—';
}

function submissionTierLabel(notes: string): string {
  if (notes.startsWith('[Draft]')) return 'Draft';
  if (notes.startsWith('[Final]')) return 'Final';
  return 'Submission';
}

function ProgressTracker({ stageId }: { stageId: (typeof STAGE_ORDER)[number] }) {
  const index = stageProgress(stageId);
  return (
    <ol className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-6">
      {STAGE_ORDER.map((step, i) => {
        const done = i < index;
        const current = i === index;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                current
                  ? 'bg-nilink-accent text-white ring-2 ring-nilink-accent/25'
                  : done
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`text-[11px] font-semibold ${current ? 'text-nilink-ink' : done ? 'text-emerald-700' : 'text-gray-500'}`}>
              {step.replace(/_/g, ' ')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function DealManagement({ initialDealId = null }: { initialDealId?: string | null }) {
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ListTab>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiDealDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submissionsByDeliverable, setSubmissionsByDeliverable] = useState<Record<string, ApiSubmission[]>>({});
  const [campaignTitle, setCampaignTitle] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [contractAgreementChecked, setContractAgreementChecked] = useState(false);
  const [submitForms, setSubmitForms] = useState<
    Record<string, { tier: 'draft' | 'final'; url: string; body: string; notes: string }>
  >({});

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDeals(await fetchDealsList());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filteredDeals = useMemo(() => deals.filter((d) => (tab === 'done' ? isDoneDeal(d) : !isDoneDeal(d))), [deals, tab]);

  const sectionForDeal = useCallback((deal: ApiDeal): AthleteDealSection => {
    if (isDoneDeal(deal)) return 'completed';
    if (deal.nextActionOwner === 'athlete') return 'needs_action';
    if (deal.status === 'under_review' || deal.nextActionLabel.toLowerCase().includes('review')) {
      return 'awaiting_review';
    }
    return 'in_progress';
  }, []);

  const groupedOpenDeals = useMemo(() => {
    const out: Record<Exclude<AthleteDealSection, 'completed'>, ApiDeal[]> = {
      needs_action: [],
      awaiting_review: [],
      in_progress: [],
    };
    for (const deal of filteredDeals) {
      const section = sectionForDeal(deal);
      if (section === 'completed') continue;
      out[section].push(deal);
    }
    return out;
  }, [filteredDeals, sectionForDeal]);

  const tabCounts = useMemo(
    () => ({
      open: deals.filter((d) => !isDoneDeal(d)).length,
      done: deals.filter((d) => isDoneDeal(d)).length,
    }),
    [deals]
  );

  const totalEarnings = useMemo(
    () => deals.reduce((sum, d) => sum + compensationAmountFromDealSnapshot(d.termsSnapshot), 0),
    [deals]
  );

  const loadDetail = useCallback(async (dealId: string) => {
    setDetailLoading(true);
    setActionError(null);
    setCampaignTitle(null);
    try {
      const d = await fetchDealDetail(dealId);
      setDetail(d);
      const subMap: Record<string, ApiSubmission[]> = {};
      await Promise.all(
        d.deliverables.map(async (del) => {
          try {
            subMap[del.id] = await fetchSubmissionsForDeliverable(del.id);
          } catch {
            subMap[del.id] = [];
          }
        })
      );
      setSubmissionsByDeliverable(subMap);
      const initForms: Record<string, { tier: 'draft' | 'final'; url: string; body: string; notes: string }> = {};
      for (const del of d.deliverables) {
        initForms[del.id] = { tier: 'draft', url: '', body: '', notes: '' };
      }
      setSubmitForms(initForms);
      if (d.deal.campaignId) {
        try {
          const cRes = await authFetch(`/api/campaigns/${d.deal.campaignId}`);
          if (cRes.ok) {
            const cj = (await cRes.json()) as { name?: string };
            if (typeof cj.name === 'string' && cj.name) setCampaignTitle(cj.name);
          }
        } catch {
          /* optional */
        }
      }
    } catch {
      setDetail(null);
      setSubmissionsByDeliverable({});
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setDetail(null);
      setSubmissionsByDeliverable({});
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!initialDealId) return;
    setSelectedId(initialDealId);
  }, [initialDealId]);

  useEffect(() => {
    setContractAgreementChecked(false);
  }, [selectedId, detail?.contract?.id, detail?.contract?.status]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setPendingKey(key);
    setActionError(null);
    try {
      await fn();
      if (selectedId) await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPendingKey(null);
    }
  };

  const yourTurn = (d: ApiDeal) => d.nextActionOwner === 'athlete';
  const stageProjection = useMemo(() => {
    if (!detail) return null;
    return buildDealStageProjection({
      actor: 'athlete',
      deal: detail.deal,
      contract: detail.contract,
      payment: detail.payment,
      deliverables: detail.deliverables,
      submissionsByDeliverable,
    });
  }, [detail, submissionsByDeliverable]);
  const timelineRows = useMemo(() => {
    if (!detail) return [];
    return filterMainTimelineActivities(detail.activities).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [detail]);

  return (
    <div className="flex h-full min-h-full flex-col bg-nilink-page font-sans text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white py-8">
        <div className="relative">
          <DashboardPageHeader title="Deals" subtitle="Agreed terms, submissions, and payouts" className="mb-6" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl bg-nilink-sidebar p-6 shadow-xl">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-nilink-accent-bright/15 blur-2xl" />
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Agreed value (est.)</p>
              <p className="mt-2 text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                ${totalEarnings.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-400">From accepted offer terms</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Open deals</p>
              <p className="mt-2 text-4xl font-black text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {tabCounts.open}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Completed</p>
              <p className="mt-2 text-4xl font-black text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {tabCounts.done}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-8 pt-5 dash-main-gutter-x">
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-gray-700">
            Your deals{' '}
            <span className="font-normal text-gray-400">
              ({filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'})
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter deals">
            {(['open', 'done'] as const).map((t) => {
              const selected = tab === t;
              const label = t === 'open' ? 'In progress' : 'Done';
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition sm:text-[13px] ${
                    selected
                      ? 'border-gray-400 bg-gray-100 text-gray-900'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {label}{' '}
                  <span className={selected ? 'text-gray-500' : 'text-gray-400'}>({tabCounts[t]})</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : tab === 'done' ? (
          <div className="space-y-4">
            {filteredDeals.map((deal) => {
              const terms = parseTermsSnapshot(deal.termsSnapshot);
              return (
                <motion.div
                  key={deal.id}
                  layout
                  className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
                  onClick={() => setSelectedId(deal.id)}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Brand</p>
                      <h3 className="text-2xl font-bold text-nilink-ink" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {formatShortId(deal.brandUserId).toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-600">{terms?.compensationLine ?? 'Sponsorship deal'}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-400">{humanizeDealStatus(deal.status)}</span>
                  </div>
                  <p className="text-sm text-gray-600">Next step: {deal.nextActionLabel}</p>
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      Updated {formatIsoDate(deal.updatedAt)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {([
              ['needs_action', 'Needs Action'],
              ['awaiting_review', 'Awaiting Review'],
              ['in_progress', 'In Progress'],
            ] as const).map(([key, label]) =>
              groupedOpenDeals[key].length > 0 ? (
                <section key={key}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                    {label} ({groupedOpenDeals[key].length})
                  </h3>
                  <div className="space-y-4">
                    {groupedOpenDeals[key].map((deal) => {
                      const terms = parseTermsSnapshot(deal.termsSnapshot);
                      return (
                        <motion.div
                          key={deal.id}
                          layout
                          className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
                          onClick={() => setSelectedId(deal.id)}
                          whileHover={{ y: -2 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        >
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Brand</p>
                              <h3 className="text-2xl font-bold text-nilink-ink" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                {formatShortId(deal.brandUserId).toUpperCase()}
                              </h3>
                              <p className="text-sm text-gray-600">{terms?.compensationLine ?? 'Sponsorship deal'}</p>
                            </div>
                            <div className="text-right">
                              {yourTurn(deal) ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-nilink-accent/15 px-3 py-1 text-xs font-bold text-nilink-accent">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Your turn
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-gray-400">
                                  Waiting on {nextOwnerLabel(deal.nextActionOwner)}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">Next step: {deal.nextActionLabel}</p>
                          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                            <span className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              Updated {formatIsoDate(deal.updatedAt)}
                            </span>
                            <ChevronRight className="h-5 w-5 text-gray-300" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              ) : null
            )}
            {groupedOpenDeals.needs_action.length === 0 &&
            groupedOpenDeals.awaiting_review.length === 0 &&
            groupedOpenDeals.in_progress.length === 0 ? (
              <p className="py-8 text-sm text-gray-500">No active deals in this view.</p>
            ) : null}
          </div>
        )}
      </div>

      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4 sm:p-8"
          onClick={() => setSelectedId(null)}
          role="dialog"
          aria-modal
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl cursor-auto overflow-auto rounded-2xl border border-gray-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading deal…
              </div>
            ) : (
              <>
                <div className="border-b border-gray-100 bg-nilink-sidebar px-6 py-5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Deal overview</p>
                  <p className="mt-1 text-lg font-semibold">Collaboration with this brand</p>
                  <p className="mt-1 text-xs text-white/85">
                    {campaignTitle ? `Campaign: ${campaignTitle}` : 'Direct collaboration'}
                  </p>
                  <p className="mt-1 text-xs text-white/85">
                    {stageProjection?.stageLabel ?? 'Deal'} · {stageProjection?.statusLine ?? detail.deal.nextActionLabel}
                  </p>
                </div>

                <div className="space-y-5 p-5">
                  {actionError ? (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {actionError}
                    </div>
                  ) : null}

                  {stageProjection ? (
                    <section className="rounded-xl border border-gray-100 bg-nilink-page p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-nilink-ink">{stageProjection.stageLabel}</h3>
                          <p className="text-xs text-gray-600">{stageProjection.stageDescription}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                          {stageProjection.statusLine}
                        </span>
                      </div>
                      {stageProjection.isDisputed ? (
                        <p className="mt-2 text-xs font-semibold text-amber-700">This deal is currently in dispute.</p>
                      ) : null}
                      <div className="mt-3">
                        <ProgressTracker stageId={stageProjection.stageId} />
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Next action</h3>
                    <p className="mt-2 text-sm font-semibold text-nilink-ink">
                      {stageProjection?.primaryAction?.label ?? 'Continue with current deal workflow'}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {stageProjection?.primaryAction?.enabled
                        ? 'Complete this step now to keep the deal moving.'
                        : stageProjection?.primaryAction?.reason ?? 'No action available at this moment.'}
                    </p>
                    {detail.contract?.status === 'sent_for_signature' ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <label className="flex items-start gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={contractAgreementChecked}
                            onChange={(e) => setContractAgreementChecked(e.target.checked)}
                            className="mt-0.5"
                          />
                          I have reviewed this contract and agree to proceed with this deal.
                        </label>
                        <button
                          type="button"
                          disabled={pendingKey === 'sign' || !contractAgreementChecked}
                          onClick={() =>
                            void run('sign', async () => {
                              await patchContractStatus(detail.contract!.id, 'signed');
                            })
                          }
                          className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Sign contract
                        </button>
                      </div>
                    ) : null}
                    {stageProjection?.remaining.length ? (
                      <ul className="mt-3 space-y-1 text-xs text-gray-600">
                        {stageProjection.remaining.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>

                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Deliverables</h3>
                    <div className="space-y-4">
                      {detail.deliverables.map((del) => {
                        const subs = (submissionsByDeliverable[del.id] ?? []).slice().sort((a, b) => a.version - b.version);
                        const form = submitForms[del.id] ?? { tier: 'draft', url: '', body: '', notes: '' };
                        const projection = buildDeliverableProjection({
                          actor: 'athlete',
                          deliverable: del,
                          submissionsByDeliverable,
                        });
                        const postExecutionStage = stageProjection?.stageId === 'payment' || stageProjection?.stageId === 'closed';
                        const displayStatusLabel = postExecutionStage
                          ? del.status === 'completed'
                            ? 'Completed'
                            : 'In payout phase'
                          : projection.statusLabel;
                        return (
                          <div key={del.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-nilink-ink">{del.title}</p>
                                <p className="text-xs text-gray-500">
                                  Due {del.dueAt ? formatIsoDate(del.dueAt) : 'TBD'} · Revisions {del.revisionCountUsed}/{del.revisionLimit}
                                </p>
                              </div>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                                {displayStatusLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">{del.instructions}</p>
                            <p className="mt-2 text-xs text-gray-500">
                              Latest: {projection.latestSubmissionLabel}
                              {projection.latestSubmissionAt ? ` · ${formatIsoDate(projection.latestSubmissionAt)}` : ''}
                            </p>
                            {projection.feedback ? (
                              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                Brand feedback: {projection.feedback}
                              </p>
                            ) : null}

                            {subs.length > 1 ? (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-[11px] font-bold uppercase text-gray-500">
                                  View submission history ({subs.length})
                                </summary>
                                <ul className="mt-2 space-y-2">
                                  {subs.map((s) => (
                                    <li key={s.id} className="rounded-lg bg-gray-50 p-2 text-sm">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-semibold text-nilink-ink">
                                          v{s.version} · {submissionTierLabel(s.notes)}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatIsoDate(s.submittedAt)}</span>
                                      </div>
                                      {s.notes ? <p className="mt-1 text-xs text-gray-600">{s.notes}</p> : null}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : null}

                            {projection.primaryAction?.key === 'submit_work' ? (
                              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-3">
                                <p className="text-xs font-bold uppercase text-gray-500">{projection.primaryAction.label}</p>
                                <div className="mt-2 flex gap-3 text-sm">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`tier-${del.id}`}
                                      checked={form.tier === 'draft'}
                                      onChange={() =>
                                        setSubmitForms((prev) => ({
                                          ...prev,
                                          [del.id]: { ...form, tier: 'draft' },
                                        }))
                                      }
                                    />
                                    Draft
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`tier-${del.id}`}
                                      checked={form.tier === 'final'}
                                      onChange={() =>
                                        setSubmitForms((prev) => ({
                                          ...prev,
                                          [del.id]: { ...form, tier: 'final' },
                                        }))
                                      }
                                    />
                                    Final
                                  </label>
                                </div>
                                <input
                                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  placeholder="Link (optional)"
                                  value={form.url}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [del.id]: { ...form, url: e.target.value },
                                    }))
                                  }
                                />
                                <textarea
                                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  rows={3}
                                  placeholder="Describe what you are submitting..."
                                  value={form.body}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [del.id]: { ...form, body: e.target.value },
                                    }))
                                  }
                                />
                                <textarea
                                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  rows={2}
                                  placeholder="Optional note to the brand"
                                  value={form.notes}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [del.id]: { ...form, notes: e.target.value },
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  disabled={pendingKey === `sub-${del.id}`}
                                  onClick={() =>
                                    void run(`sub-${del.id}`, async () => {
                                      const prefix = form.tier === 'draft' ? '[Draft] ' : '[Final] ';
                                      const notes = [prefix, form.notes].filter(Boolean).join(' ').trim();
                                      await createDeliverableSubmission(del.id, {
                                        body: form.body.trim(),
                                        notes,
                                        artifacts: form.url.trim() ? [{ kind: 'url', ref: form.url.trim() }] : undefined,
                                      });
                                      setSubmitForms((prev) => ({
                                        ...prev,
                                        [del.id]: { tier: 'draft', url: '', body: '', notes: '' },
                                      }));
                                    })
                                  }
                                  className="mt-3 w-full rounded-xl bg-nilink-ink py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                >
                                  Send submission
                                </button>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-gray-400">No athlete action needed for this deliverable right now.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Timeline</h3>
                    <ul className="space-y-2">
                      {timelineRows.map((a) => (
                        <li key={a.id} className="text-sm text-gray-700">
                          <span className="font-semibold">{a.eventType.replace(/_/g, ' ')}</span>
                          <span className="ml-2 text-xs text-gray-400">{formatIsoDate(a.createdAt)}</span>
                        </li>
                      ))}
                      {timelineRows.length === 0 ? <li className="text-sm text-gray-400">No major updates yet.</li> : null}
                    </ul>
                  </section>

                  <details className="rounded-xl border border-gray-200 bg-nilink-page p-4">
                    <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-gray-500">
                      Additional details
                    </summary>
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <p>Contract: {detail.contract ? contractStatusCopy(detail.contract.status) : 'No contract yet'}</p>
                      <p>
                        Payment:{' '}
                        {detail.payment
                          ? `${detail.payment.currency} ${detail.payment.amount.toLocaleString()}`
                          : 'No payment record yet'}
                      </p>
                      {parseTermsSnapshot(detail.deal.termsSnapshot)?.notes ? (
                        <p>Notes: {parseTermsSnapshot(detail.deal.termsSnapshot)!.notes}</p>
                      ) : null}
                    </div>
                  </details>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-nilink-ink hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
