'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { authFetch } from '@/lib/authFetch';
import {
  fetchDealDetail,
  fetchDealsList,
  fetchSubmissionsForDeliverable,
  formatIsoDate,
  formatShortId,
  humanizeDealStatus,
  parseTermsSnapshot,
  patchContractStatus,
  patchPaymentStatus,
  patchSubmission,
  postDealContract,
  uploadDealContractFromFile,
  type ApiDeal,
  type ApiDealDetail,
  type ApiDeliverable,
  type ApiPayment,
  type ApiSubmission,
} from '@/lib/deals/dashboardDealsClient';
import { CONTRACT_STATUSES, DEAL_STATUSES, PAYMENT_STATUSES } from '@/lib/campaigns/deals/types';
import {
  buildDealStageProjection,
  buildDeliverableProjection,
  contractStatusCopy,
  filterMainTimelineActivities,
  paymentStatusCopy,
  stageProgress,
  STAGE_ORDER,
} from '@/lib/deals/stageProjection';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

function nextOwnerLabel(owner: ApiDeal['nextActionOwner']): string {
  if (owner === 'brand') return 'Brand';
  if (owner === 'athlete') return 'Athlete';
  if (owner === 'system') return 'System';
  return '—';
}

function DealStatusBadge({ status }: { status: string }) {
  const soft =
    status === 'paid' || status === 'closed'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'cancelled' || status === 'disputed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : status === 'under_review' || status === 'submission_in_progress'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${soft}`}>
      {humanizeDealStatus(status)}
    </span>
  );
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

export function BusinessDeals() {
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  /** Empty string = all deal lifecycle statuses */
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiDealDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submissionsByDeliverable, setSubmissionsByDeliverable] = useState<Record<string, ApiSubmission[]>>({});
  const [campaignTitle, setCampaignTitle] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [contractUrlInput, setContractUrlInput] = useState('');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const contractFilePrimaryRef = useRef<HTMLInputElement>(null);
  const contractFileAdvancedRef = useRef<HTMLInputElement>(null);
  const [revisionFeedback, setRevisionFeedback] = useState<Record<string, string>>({});

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const rows = await fetchDealsList();
      setDeals(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load deals');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filteredDeals = useMemo(() => {
    const byStatus = statusFilter.trim()
      ? deals.filter((d) => d.status === statusFilter.trim())
      : deals;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((d) => {
      const terms = parseTermsSnapshot(d.termsSnapshot);
      const hay = [
        d.athleteUserId,
        d.id,
        d.status,
        d.nextActionLabel,
        terms?.offerOrigin ?? '',
        terms?.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [deals, searchQuery, statusFilter]);

  const loadDetail = useCallback(async (dealId: string) => {
    setDetailLoading(true);
    setDetailError(null);
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
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load deal');
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

  const refreshFromRealtime = useCallback(() => {
    void loadList();
    if (selectedId) void loadDetail(selectedId);
  }, [loadList, loadDetail, selectedId]);
  useDealsRealtimeRefresh({ enabled: true, dealId: selectedId, onInvalidate: refreshFromRealtime });

  const pendingReviews = useMemo(() => {
    if (!detail) return [];
    const out: { submission: ApiSubmission; deliverable: ApiDeliverable }[] = [];
    for (const del of detail.deliverables) {
      const subs = submissionsByDeliverable[del.id] ?? [];
      const latest = subs.reduce<ApiSubmission | null>((acc, s) => (!acc || s.version > acc.version ? s : acc), null);
      if (latest && (latest.status === 'submitted' || latest.status === 'viewed')) {
        out.push({ submission: latest, deliverable: del });
      }
    }
    return out;
  }, [detail, submissionsByDeliverable]);
  const stageProjection = useMemo(() => {
    if (!detail) return null;
    return buildDealStageProjection({
      actor: 'brand',
      deal: detail.deal,
      contract: detail.contract,
      payment: detail.payment,
      deliverables: detail.deliverables,
      submissionsByDeliverable,
    });
  }, [detail, submissionsByDeliverable]);
  const primaryReviewTarget = pendingReviews[0] ?? null;

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setPendingAction(key);
    setActionError(null);
    try {
      await fn();
      if (selectedId) await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setPendingAction(null);
    }
  };

  const sortedActivities = useMemo(() => {
    const acts = detail?.activities ?? [];
    return filterMainTimelineActivities(acts).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [detail?.activities]);

  return (
    <div className="h-full flex flex-col bg-nilink-surface overflow-hidden text-nilink-ink">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-4 pt-5">
          <DashboardPageHeader title="Deals" subtitle="Live pipeline, deliverables, and reviews" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by athlete, status, notes..."
                className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
            <div className="flex min-w-[180px] flex-1 max-w-xs items-center gap-2">
              <label htmlFor="deal-status-filter" className="sr-only">
                Filter by deal status
              </label>
              <select
                id="deal-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All statuses</option>
                {DEAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanizeDealStatus(s)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void loadList()}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-8 pt-4 dash-main-gutter-x">
          {listError ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {listError}
            </div>
          ) : null}

          {listLoading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading deals…
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white/80 py-12 text-center text-sm text-gray-500">
              {deals.length === 0
                ? 'No deals yet.'
                : 'No deals match the current status filter and search.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/90 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    <th className="whitespace-nowrap px-4 py-3">Athlete</th>
                    <th className="whitespace-nowrap px-4 py-3">Deal status</th>
                    <th className="min-w-[200px] px-4 py-3">Next step</th>
                    <th className="whitespace-nowrap px-4 py-3">Type</th>
                    <th className="whitespace-nowrap px-4 py-3">Updated</th>
                    <th className="w-10 px-2 py-3" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((d) => {
                    const terms = parseTermsSnapshot(d.termsSnapshot);
                    return (
                      <tr
                        key={d.id}
                        className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50/80"
                        onClick={() => setSelectedId(d.id)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-nilink-ink">
                          {formatShortId(d.athleteUserId)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <DealStatusBadge status={d.status} />
                        </td>
                        <td className="max-w-md px-4 py-3 text-gray-700">
                          <span className="font-semibold text-nilink-accent">{nextOwnerLabel(d.nextActionOwner)}:</span>{' '}
                          <span className="line-clamp-2">{d.nextActionLabel || '—'}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                          {d.campaignId ? 'Campaign deal' : 'Direct deal'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatIsoDate(d.updatedAt)}</td>
                        <td className="px-2 py-3 text-gray-300">
                          <ChevronRight className="h-4 w-4" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-gray-100 bg-white shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[92vh] overflow-y-auto">
              {detailLoading ? (
                <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading deal…
                </div>
              ) : detailError || !detail ? (
                <div className="p-8 text-sm text-red-600">{detailError || 'Deal not found'}</div>
              ) : (
                <>
                  <div className="border-b border-gray-100 bg-nilink-sidebar px-6 py-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Deal overview</p>
                    <p className="mt-1 text-lg font-semibold">Collaboration with this athlete</p>
                    <p className="mt-1 text-xs text-white/85">
                      {campaignTitle ? `Campaign: ${campaignTitle}` : 'Direct collaboration'}
                    </p>
                    <p className="mt-1 text-xs text-white/85">
                      {stageProjection?.stageLabel ?? 'Deal'} · {stageProjection?.statusLine ?? humanizeDealStatus(detail.deal.status)}
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
                      <section className="rounded-2xl border border-gray-100 bg-nilink-page p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-nilink-ink">{stageProjection.stageLabel}</h3>
                            <p className="text-xs text-gray-600">{stageProjection.stageDescription}</p>
                          </div>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                            {stageProjection.statusLine}
                          </span>
                        </div>
                        <div className="mt-3">
                          <ProgressTracker stageId={stageProjection.stageId} />
                        </div>
                      </section>
                    ) : null}

                    <section className="rounded-2xl border border-gray-100 bg-white p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Next action</h3>
                      {primaryReviewTarget ? (
                        <>
                          <p className="mt-2 text-sm font-semibold text-nilink-ink">
                            Review latest submission for {primaryReviewTarget.deliverable.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-600">Approve to advance this deliverable, or request a targeted revision.</p>
                          <p className="text-xs text-gray-500">
                            v{primaryReviewTarget.submission.version} · {formatIsoDate(primaryReviewTarget.submission.submittedAt)}
                          </p>
                          <textarea
                            className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
                            rows={2}
                            placeholder="Feedback when requesting revision..."
                            value={revisionFeedback[primaryReviewTarget.submission.id] ?? ''}
                            onChange={(e) =>
                              setRevisionFeedback((prev) => ({ ...prev, [primaryReviewTarget.submission.id]: e.target.value }))
                            }
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={pendingAction === `ap-${primaryReviewTarget.submission.id}`}
                              onClick={() =>
                                void runAction(`ap-${primaryReviewTarget.submission.id}`, async () => {
                                  await patchSubmission(primaryReviewTarget.submission.id, { status: 'approved' });
                                })
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve submission
                            </button>
                            <button
                              type="button"
                              disabled={pendingAction === `rv-${primaryReviewTarget.submission.id}`}
                              onClick={() =>
                                void runAction(`rv-${primaryReviewTarget.submission.id}`, async () => {
                                  const fb = revisionFeedback[primaryReviewTarget.submission.id]?.trim();
                                  await patchSubmission(primaryReviewTarget.submission.id, {
                                    status: 'revision_requested',
                                    ...(fb ? { feedback: fb } : {}),
                                  });
                                })
                              }
                              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                            >
                              Request revision
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="mt-2 text-sm font-semibold text-nilink-ink">
                            {stageProjection?.primaryAction?.label ?? 'No immediate brand action required'}
                          </p>
                          <p className="mt-1 text-xs text-gray-600">Keep the workflow focused on the current stage.</p>
                          {!stageProjection?.primaryAction?.enabled ? (
                            <p className="text-xs text-gray-500">
                              {stageProjection?.primaryAction?.reason ?? 'Waiting on athlete/system progression.'}
                            </p>
                          ) : null}
                          {stageProjection?.primaryAction?.key === 'upload_contract' ? (
                            <div className="mt-3 space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <input
                                  className="min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  placeholder="Contract document URL"
                                  value={contractUrlInput}
                                  onChange={(e) => setContractUrlInput(e.target.value)}
                                />
                                <button
                                  type="button"
                                  disabled={pendingAction === 'contract-post'}
                                  onClick={() =>
                                    void runAction('contract-post', async () => {
                                      await postDealContract(detail.deal.id, contractUrlInput.trim() || undefined);
                                      setContractUrlInput('');
                                    })
                                  }
                                  className="rounded-lg bg-nilink-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                >
                                  Save URL
                                </button>
                              </div>
                              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2">
                                <p className="text-[11px] text-gray-600">Or upload PDF / Word (stored in Supabase).</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <input
                                      ref={contractFilePrimaryRef}
                                      type="file"
                                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                      className="max-w-full text-xs text-gray-700 file:mr-2 file:rounded-md file:border file:border-gray-200 file:bg-white file:px-2 file:py-1"
                                      onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
                                    />
                                  <button
                                    type="button"
                                    disabled={pendingAction === 'contract-file' || !contractFile}
                                    onClick={() =>
                                      void runAction('contract-file', async () => {
                                        if (!contractFile) return;
                                        await uploadDealContractFromFile(detail.deal.id, contractFile);
                                        setContractFile(null);
                                        if (contractFilePrimaryRef.current) contractFilePrimaryRef.current.value = '';
                                        if (contractFileAdvancedRef.current) contractFileAdvancedRef.current.value = '';
                                      })
                                    }
                                    className="rounded-lg bg-nilink-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                  >
                                    Upload file
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
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
                      <ul className="space-y-3">
                        {detail.deliverables.map((del) => {
                          const subs = submissionsByDeliverable[del.id] ?? [];
                          const latest = subs.reduce<ApiSubmission | null>((acc, s) => (!acc || s.version > acc.version ? s : acc), null);
                          const projection = buildDeliverableProjection({
                            actor: 'brand',
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
                            <li key={del.id} className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-nilink-ink">{del.title}</p>
                                  <p className="text-xs text-gray-500">
                                    Due {del.dueAt ? formatIsoDate(del.dueAt) : '—'} · Revisions {del.revisionCountUsed}/{del.revisionLimit}
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
                                  Feedback: {projection.feedback}
                                </p>
                              ) : null}
                              {latest?.notes ? <p className="mt-2 text-xs text-gray-600">{latest.notes}</p> : null}
                              {projection.primaryAction?.key === 'approve_submission' && latest ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={pendingAction === `ap-${latest.id}`}
                                    onClick={() =>
                                      void runAction(`ap-${latest.id}`, async () => {
                                        await patchSubmission(latest.id, { status: 'approved' });
                                      })
                                    }
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Approve submission
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pendingAction === `rv-${latest.id}`}
                                    onClick={() =>
                                      void runAction(`rv-${latest.id}`, async () => {
                                        const fb = revisionFeedback[latest.id]?.trim();
                                        await patchSubmission(latest.id, {
                                          status: 'revision_requested',
                                          ...(fb ? { feedback: fb } : {}),
                                        });
                                      })
                                    }
                                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                  >
                                    Request revision
                                  </button>
                                </div>
                              ) : (
                                <p className="mt-3 text-xs text-gray-400">No brand action needed on this deliverable right now.</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>

                    <section>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Timeline</h3>
                      <ul className="space-y-2 border-l-2 border-gray-200 pl-4">
                        {sortedActivities.map((a) => (
                          <li key={a.id} className="relative text-sm text-gray-700">
                            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-nilink-accent" />
                            <span className="font-semibold text-nilink-ink">{a.eventType.replace(/_/g, ' ')}</span>
                            <span className="ml-2 text-xs text-gray-400">{formatIsoDate(a.createdAt)}</span>
                          </li>
                        ))}
                        {sortedActivities.length === 0 ? <li className="text-sm text-gray-400">No major updates yet.</li> : null}
                      </ul>
                    </section>

                    <details className="rounded-2xl border border-dashed border-gray-200 p-4">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-gray-500">
                        Operator controls
                      </summary>
                      <div className="mt-3 space-y-4">
                        <section className="rounded-xl border border-gray-100 bg-nilink-page p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Contract operations</h4>
                          {detail.contract ? (
                            <>
                              <p className="mt-1 text-sm">Status: {contractStatusCopy(detail.contract.status)}</p>
                              {detail.contract.fileUrl ? (
                                <a
                                  href={detail.contract.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-block text-sm font-semibold text-nilink-accent hover:underline"
                                >
                                  Open file link
                                </a>
                              ) : null}
                              <div className="mt-3 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  <input
                                    className="min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    placeholder="Document URL"
                                    value={contractUrlInput}
                                    onChange={(e) => setContractUrlInput(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    disabled={pendingAction === 'contract-post'}
                                    onClick={() =>
                                      void runAction('contract-post', async () => {
                                        await postDealContract(detail.deal.id, contractUrlInput.trim() || undefined);
                                        setContractUrlInput('');
                                      })
                                    }
                                    className="rounded-lg bg-nilink-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                  >
                                    Save URL
                                  </button>
                                </div>
                                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2">
                                  <p className="text-[11px] text-gray-600">Or upload PDF / Word.</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <input
                                      ref={contractFileAdvancedRef}
                                      type="file"
                                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                      className="max-w-full text-xs text-gray-700 file:mr-2 file:rounded-md file:border file:border-gray-200 file:bg-white file:px-2 file:py-1"
                                      onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
                                    />
                                    <button
                                      type="button"
                                      disabled={pendingAction === 'contract-file' || !contractFile}
                                      onClick={() =>
                                        void runAction('contract-file', async () => {
                                          if (!contractFile) return;
                                          await uploadDealContractFromFile(detail.deal.id, contractFile);
                                          setContractFile(null);
                                          if (contractFilePrimaryRef.current) contractFilePrimaryRef.current.value = '';
                                          if (contractFileAdvancedRef.current) contractFileAdvancedRef.current.value = '';
                                        })
                                      }
                                      className="rounded-lg bg-nilink-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                    >
                                      Upload file
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {CONTRACT_STATUSES.filter((s) => s !== 'signed').map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    disabled={pendingAction === `c-${s}`}
                                    onClick={() =>
                                      void runAction(`c-${s}`, async () => {
                                        await patchContractStatus(detail.contract!.id, s);
                                      })
                                    }
                                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    Set {s.replace(/_/g, ' ')}
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">No contract record.</p>
                          )}
                        </section>

                        <section className="rounded-xl border border-gray-100 bg-nilink-page p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Payment operations</h4>
                          {detail.payment ? (
                            <>
                              <p className="text-sm text-gray-600">
                                {detail.payment.currency} {detail.payment.amount.toLocaleString()} · {paymentStatusCopy(detail.payment.status)}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {PAYMENT_STATUSES.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    disabled={pendingAction === `p-${s}`}
                                    onClick={() =>
                                      void runAction(`p-${s}`, async () => {
                                        await patchPaymentStatus((detail.payment as ApiPayment).id, s);
                                      })
                                    }
                                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    {s.replace(/_/g, ' ')}
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">No payment record.</p>
                          )}
                        </section>
                      </div>
                    </details>

                    <div className="flex gap-3 pb-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-nilink-ink hover:bg-gray-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
