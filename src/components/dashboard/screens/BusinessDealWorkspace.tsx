'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ChevronLeft, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import {
  fetchDealDetail,
  fetchSubmissionsForDeliverable,
  formatIsoDate,
  formatShortId,
  humanizeDealStatus,
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
import { CONTRACT_STATUSES, PAYMENT_STATUSES } from '@/lib/campaigns/deals/types';
import {
  buildDealStageProjection,
  buildDeliverableProjection,
  contractStatusCopy,
  paymentStatusCopy,
  stageProgress,
  STAGE_ORDER,
} from '@/lib/deals/stageProjection';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

function DealStatusBadge({ status, surface = 'light' }: { status: string; surface?: 'light' | 'dark' }) {
  const onLight =
    status === 'paid' || status === 'closed'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'cancelled' || status === 'disputed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : status === 'under_review' || status === 'submission_in_progress'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-gray-50 text-gray-700 border-gray-200';
  const onDark =
    status === 'paid' || status === 'closed'
      ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
      : status === 'cancelled' || status === 'disputed'
        ? 'border-red-400/40 bg-red-500/20 text-red-100'
        : status === 'under_review' || status === 'submission_in_progress'
          ? 'border-amber-400/40 bg-amber-500/20 text-amber-100'
          : 'border-white/25 bg-white/10 text-white/90';
  const soft = surface === 'dark' ? onDark : onLight;
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${soft}`}
    >
      {humanizeDealStatus(status)}
    </span>
  );
}

function stageStepLabel(step: (typeof STAGE_ORDER)[number]): string {
  const map: Record<(typeof STAGE_ORDER)[number], string> = {
    agreement: 'Agreement',
    work_in_progress: 'Work in progress',
    review_revisions: 'Review & revisions',
    completed: 'Deliverables done',
    payment: 'Payment',
    closed: 'Closed',
  };
  return map[step];
}

function ProgressTracker({ stageId }: { stageId: (typeof STAGE_ORDER)[number] }) {
  const index = stageProgress(stageId);
  return (
    <ol className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
      {STAGE_ORDER.map((step, i) => {
        const done = i < index;
        const current = i === index;
        return (
          <li key={step} className="flex min-w-0 items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                current
                  ? 'bg-nilink-accent text-white ring-2 ring-nilink-accent/25'
                  : done
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/15 text-white/70'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              className={`min-w-0 truncate text-[11px] font-semibold leading-tight ${
                current ? 'text-white' : done ? 'text-emerald-200' : 'text-white/60'
              }`}
            >
              {stageStepLabel(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function nextTurnHeadline(owner: ApiDeal['nextActionOwner']): { label: string; className: string } {
  if (owner === 'brand') {
    return {
      label: 'Your turn',
      className: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
    };
  }
  if (owner === 'athlete') {
    return {
      label: 'Waiting on athlete',
      className: 'border-white/25 bg-white/10 text-white/90',
    };
  }
  if (owner === 'system') {
    return {
      label: 'System / payment',
      className: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    };
  }
  return {
    label: 'Status',
    className: 'border-white/20 bg-white/5 text-white/80',
  };
}

const SECTION_IDS = {
  progress: 'deal-progress',
  tasks: 'deal-your-tasks',
  deliverables: 'deal-deliverables',
  contractPayment: 'deal-contract-payment',
} as const;

type BusinessDealWorkspaceProps = {
  dealId: string;
};

export function BusinessDealWorkspace({ dealId }: BusinessDealWorkspaceProps) {
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
  const [contractStatusDraft, setContractStatusDraft] = useState<string>('');
  const [paymentStatusDraft, setPaymentStatusDraft] = useState<string>('');

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setActionError(null);
    setCampaignTitle(null);
    try {
      const d = await fetchDealDetail(id);
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
    void loadDetail(dealId);
  }, [dealId, loadDetail]);

  const refreshFromRealtime = useCallback(() => {
    void loadDetail(dealId);
  }, [dealId, loadDetail]);
  useDealsRealtimeRefresh({ enabled: true, dealId, onInvalidate: refreshFromRealtime });

  useEffect(() => {
    if (detail?.contract) setContractStatusDraft(detail.contract.status);
  }, [detail?.contract?.id, detail?.contract?.status]);

  useEffect(() => {
    if (detail?.payment) setPaymentStatusDraft(detail.payment.status);
  }, [detail?.payment?.id, detail?.payment?.status]);

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
      await loadDetail(dealId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setPendingAction(null);
    }
  };

  /** One-line page purpose for the dashboard header (not raw IDs). */
  const dealPageDescription =
    'Manage contract, deliverables, reviews, and payment for this athlete collaboration.';

  if (detailLoading && !detail) {
    return (
      <div className="flex min-h-[40vh] items-center gap-2 dash-main-gutter-x py-12 text-sm text-gray-500">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
        Loading deal…
      </div>
    );
  }

  if (detailError || !detail) {
    return (
      <div className="dash-main-gutter-x py-8">
        <Link
          href="/dashboard/deals"
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-nilink-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/40 rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to deals
        </Link>
        <p className="mt-6 text-sm text-red-600">{detailError || 'Deal not found'}</p>
      </div>
    );
  }

  const turn = nextTurnHeadline(detail.deal.nextActionOwner);
  const contractDirty = detail.contract && contractStatusDraft !== detail.contract.status;
  const paymentDirty = detail.payment && paymentStatusDraft !== detail.payment.status;

  return (
    <div className="flex min-h-full flex-col bg-nilink-surface text-nilink-ink">
      <header className="shrink-0 border-b border-gray-100 bg-white dash-main-gutter-x py-4">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white pb-3">
          <Link
            href="/dashboard/deals"
            aria-label="Back to deals list"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back
          </Link>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm leading-tight">
              <li className="truncate text-gray-500">Deals</li>
              <li className="shrink-0 select-none text-gray-300" aria-hidden>
                /
              </li>
              <li className="truncate font-bold text-nilink-ink" aria-current="page">
                Deal workspace
              </li>
            </ol>
          </nav>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mt-4">
              <DashboardPageHeader
                title="Deal workspace"
                subtitle={dealPageDescription}
                className="min-w-0 !pt-0"
                animate
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto pb-10 dash-main-gutter-x pt-6">
        {detailLoading ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Refreshing…
          </div>
        ) : null}

        {actionError ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {actionError}
          </div>
        ) : null}

        <div className="w-full space-y-6 lg:space-y-8">
          {stageProjection ? (
            <motion.section
              id={SECTION_IDS.progress}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-nilink-sidebar-muted/30 bg-gradient-to-br from-nilink-sidebar via-[#2a2a2d] to-nilink-sidebar text-white shadow-lg"
            >
              <div className="border-b border-white/10 px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{stageProjection.stageLabel}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/80">{stageProjection.stageDescription}</p>
                  </div>
                  <div className="shrink-0 rounded-xl border px-3 py-2 text-center sm:text-left lg:max-w-xs">
                    <span
                      className={`inline-block rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${turn.className}`}
                    >
                      {turn.label}
                    </span>
                    <p className="mt-2 text-sm font-medium leading-snug text-white">{detail.deal.nextActionLabel || '—'}</p>
                  </div>
                </div>
                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">Deal journey</p>
                  <ProgressTracker stageId={stageProjection.stageId} />
                </div>
              </div>
            </motion.section>
          ) : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="space-y-6 lg:col-span-4" id={SECTION_IDS.tasks}>
              <section className="scroll-mt-24">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Your tasks</h2>
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm h-[420px] flex flex-col">
                  <div className="flex-1 overflow-auto p-4">
                    {primaryReviewTarget ? (
                      <>
                    <p className="mt-2 text-sm font-semibold text-nilink-ink">
                      Review submission: {primaryReviewTarget.deliverable.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Approve to move this deliverable forward, or request a revision with clear feedback.
                    </p>
                    <p className="text-xs text-gray-500">
                      Version {primaryReviewTarget.submission.version} ·{' '}
                      {formatIsoDate(primaryReviewTarget.submission.submittedAt)}
                    </p>
                    <label htmlFor="revision-feedback-primary" className="sr-only">
                      Revision feedback
                    </label>
                    <textarea
                      id="revision-feedback-primary"
                      className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
                      rows={2}
                      placeholder="Optional feedback when requesting a revision…"
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
                        className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                        className="cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Request revision
                      </button>
                    </div>
                      </>
                    ) : (
                      <>
                    <p className="mt-2 text-sm font-semibold text-nilink-ink">
                      {stageProjection?.primaryAction?.label ?? 'No immediate action required from you'}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">When something needs your attention, it will show up here.</p>
                    {!stageProjection?.primaryAction?.enabled ? (
                      <p className="text-xs text-gray-500">
                        {stageProjection?.primaryAction?.reason ?? 'Waiting on the athlete or automated steps.'}
                      </p>
                    ) : null}
                    {stageProjection?.primaryAction?.key === 'upload_contract' ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <label htmlFor="contract-url-primary" className="sr-only">
                            Contract document URL
                          </label>
                          <input
                            id="contract-url-primary"
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
                            placeholder="Link to contract document"
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
                            className="cursor-pointer rounded-lg bg-nilink-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                          >
                            Save URL
                          </button>
                        </div>
                        <div className="rounded-lg border border-dashed border-white/25 bg-white/5 px-3 py-2">
                          <p className="text-[11px] text-white/70">Or upload PDF / Word (Supabase storage).</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              ref={contractFilePrimaryRef}
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className="max-w-full text-xs text-white/90 file:mr-2 file:rounded-md file:border file:border-white/20 file:bg-white/10 file:px-2 file:py-1"
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
                              className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-nilink-ink hover:bg-white/90 disabled:opacity-50"
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
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Checklist</p>
                        <ul className="mt-2 space-y-1.5 text-xs text-gray-600">
                          {stageProjection.remaining.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="text-nilink-accent" aria-hidden>
                                ·
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-8" id={SECTION_IDS.deliverables}>
              <section className="scroll-mt-24">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Deliverables</h2>
                <ul className="grid grid-cols-1 gap-3">
                  {detail.deliverables.map((del) => {
                    const subs = submissionsByDeliverable[del.id] ?? [];
                    const latest = subs.reduce<ApiSubmission | null>((acc, s) => (!acc || s.version > acc.version ? s : acc), null);
                    const projection = buildDeliverableProjection({
                      actor: 'brand',
                      deliverable: del,
                      submissionsByDeliverable,
                    });
                    const postExecutionStage =
                      stageProjection?.stageId === 'payment' || stageProjection?.stageId === 'closed';
                    const displayStatusLabel = postExecutionStage
                      ? del.status === 'completed'
                        ? 'Completed'
                        : 'In payout phase'
                      : projection.statusLabel;
                    const isQueuedInPrimary =
                      latest &&
                      primaryReviewTarget &&
                      primaryReviewTarget.submission.id === latest.id &&
                      projection.primaryAction?.key === 'approve_submission';

                    return (
                      <li
                        key={del.id}
                        className="h-[420px] rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-nilink-ink">{del.title}</p>
                            <p className="text-xs text-gray-500">
                              Due {del.dueAt ? formatIsoDate(del.dueAt) : '—'} · Revisions {del.revisionCountUsed}/
                              {del.revisionLimit}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                            {displayStatusLabel}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{del.instructions}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          Latest: {projection.latestSubmissionLabel}
                          {projection.latestSubmissionAt ? ` · ${formatIsoDate(projection.latestSubmissionAt)}` : ''}
                        </p>
                        {projection.feedback ? (
                          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                            <span className="font-semibold">Feedback:</span> {projection.feedback}
                          </p>
                        ) : null}
                        {latest?.notes ? <p className="mt-2 text-xs text-gray-600">{latest.notes}</p> : null}
                        {projection.primaryAction?.key === 'approve_submission' && latest ? (
                          isQueuedInPrimary ? (
                            <p className="mt-3 text-xs text-gray-600">
                              <a
                                href={`#${SECTION_IDS.tasks}`}
                                className="font-semibold text-nilink-accent underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/40 rounded"
                              >
                                Review and approve in Your tasks
                              </a>{' '}
                              (same submission as the top of your queue.)
                            </p>
                          ) : (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={pendingAction === `ap-${latest.id}`}
                                onClick={() =>
                                  void runAction(`ap-${latest.id}`, async () => {
                                    await patchSubmission(latest.id, { status: 'approved' });
                                  })
                                }
                                className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                                className="cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                              >
                                Request revision
                              </button>
                            </div>
                          )
                        ) : (
                          <p className="mt-3 text-xs text-gray-400">Nothing for you to approve on this deliverable right now.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </div>

          <details
            id={SECTION_IDS.contractPayment}
            className="group scroll-mt-24 rounded-2xl border border-gray-200 bg-white shadow-sm open:ring-1 open:ring-nilink-accent/15"
          >
            <summary className="cursor-pointer list-none px-4 py-3.5 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-nilink-ink">Contract &amp; payment</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Update document link or status when something changes outside the normal flow.
                  </p>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 group-open:bg-nilink-accent-soft group-open:text-nilink-accent">
                  Advanced
                </span>
              </div>
            </summary>
            <div className="border-t border-gray-100 px-4 py-5 sm:px-5">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-nilink-page p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Contract</h3>
                  {detail.contract ? (
                    <>
                      <p className="mt-2 text-sm text-nilink-ink">
                        <span className="text-gray-500">Current status:</span>{' '}
                        <span className="font-semibold">{contractStatusCopy(detail.contract.status)}</span>
                      </p>
                      {detail.contract.fileUrl ? (
                        <a
                          href={detail.contract.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block cursor-pointer text-sm font-semibold text-nilink-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/40 rounded"
                        >
                          Open contract file
                        </a>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">No file link on record.</p>
                      )}
                      <label htmlFor="contract-url-advanced" className="mt-4 block text-xs font-semibold text-gray-600">
                        Document URL
                      </label>
                      <div className="mt-1 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            id="contract-url-advanced"
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
                            placeholder="https://…"
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
                            className="shrink-0 cursor-pointer rounded-lg bg-nilink-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                          >
                            Save URL
                          </button>
                        </div>
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2">
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
                              className="cursor-pointer rounded-lg bg-nilink-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                              Upload file
                            </button>
                          </div>
                        </div>
                      </div>
                      <label htmlFor="contract-status-select" className="mt-4 block text-xs font-semibold text-gray-600">
                        Set status
                      </label>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <select
                          id="contract-status-select"
                          value={contractStatusDraft}
                          onChange={(e) => setContractStatusDraft(e.target.value)}
                          className="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
                        >
                          {CONTRACT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {contractStatusCopy(s)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!contractDirty || pendingAction === 'contract-status-apply'}
                          onClick={() =>
                            void runAction('contract-status-apply', async () => {
                              await patchContractStatus(detail.contract!.id, contractStatusDraft);
                            })
                          }
                          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-nilink-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Apply status
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No contract record.</p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-nilink-page p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Payment</h3>
                  {detail.payment ? (
                    <>
                      <p className="mt-2 text-sm text-nilink-ink">
                        <span className="font-semibold">
                          {detail.payment.currency} {detail.payment.amount.toLocaleString()}
                        </span>
                        <span className="text-gray-500"> · </span>
                        {paymentStatusCopy(detail.payment.status)}
                      </p>
                      <label htmlFor="payment-status-select" className="mt-4 block text-xs font-semibold text-gray-600">
                        Set payment status
                      </label>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <select
                          id="payment-status-select"
                          value={paymentStatusDraft}
                          onChange={(e) => setPaymentStatusDraft(e.target.value)}
                          className="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
                        >
                          {PAYMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {paymentStatusCopy(s)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!paymentDirty || pendingAction === 'payment-status-apply'}
                          onClick={() =>
                            void runAction('payment-status-apply', async () => {
                              await patchPaymentStatus((detail.payment as ApiPayment).id, paymentStatusDraft);
                            })
                          }
                          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-nilink-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Apply status
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No payment record.</p>
                  )}
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
