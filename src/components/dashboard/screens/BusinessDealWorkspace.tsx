'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ChevronLeft, Loader2 } from 'lucide-react';
import {
  fetchDealDetail,
  fetchSubmissionsForDeliverable,
  formatIsoDate,
  patchContractStatus,
  patchDealStatus,
  patchPaymentStatus,
  patchSubmission,
  postDealContract,
  requestDealCancellation,
  respondToDealCancellation,
  uploadDealContractFromFile,
  type ApiDeal,
  type ApiDealDetail,
  type ApiDeliverable,
  type ApiPayment,
  type ApiSubmission,
} from '@/lib/deals/dashboardDealsClient';
import {
  buildDealStageProjection,
  buildDeliverableProjection,
  stageProgress,
  STAGE_ORDER,
} from '@/lib/deals/stageProjection';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

function stageStepLabel(step: (typeof STAGE_ORDER)[number]): string {
  const map: Record<(typeof STAGE_ORDER)[number], string> = {
    agreement: 'AGREEMENT',
    work_in_progress: 'WORK IN PROGRESS',
    review_revisions: 'REVIEW REVISIONS',
    completed: 'DELIVERABLES DONE',
    payment: 'PAYOUT',
    closed: 'CLOSED',
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
              className={`min-w-0 truncate text-[11px] font-bold uppercase leading-tight tracking-wide ${
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
      label: 'System / payout',
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [contractUrlInput, setContractUrlInput] = useState('');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const contractFilePrimaryRef = useRef<HTMLInputElement>(null);
  const [revisionFeedback, setRevisionFeedback] = useState<Record<string, string>>({});
  const [paymentReference, setPaymentReference] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setActionError(null);
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

  const cancellationRequester = useMemo(() => {
    if (!detail || detail.deal.status !== 'cancellation_requested') return null;
    const act = [...(detail.activities ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((a) => a.eventType === 'cancellation_requested');
    return (act?.metadata?.requestedByRole as string | undefined) ?? (act?.actorType ?? null);
  }, [detail]);

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
    'Manage contract, deliverables, reviews, and payout for this athlete collaboration.';

  if (detailLoading && !detail) {
    return (
      <div className="flex min-h-[40vh] items-center gap-2 dash-main-gutter-x py-12 text-xs font-bold uppercase tracking-wide text-gray-500">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
        LOADING DEAL…
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

  return (
    <div className="flex min-h-full flex-col bg-nilink-page font-sans text-nilink-ink">
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
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            REFRESHING…
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
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/55">{stageProjection.statusLine}</p>
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
                        Approve Submission
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
                        Request Revision
                      </button>
                    </div>
                      </>
                    ) : (
                      <>
                    <p className="mt-2 text-sm font-semibold text-nilink-ink">
                      {stageProjection?.primaryAction?.label ?? 'No Immediate Action Required From You'}
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
                          <p className="text-[11px] text-white/70">
                            Or upload PDF / Word — stored securely in Supabase (max 50 MB).
                          </p>
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
                                })
                              }
                              className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-nilink-ink hover:bg-white/90 disabled:opacity-50"
                            >
                              {pendingAction === 'contract-file' ? 'Uploading…' : 'Upload file'}
                            </button>
                          </div>
                          {contractFile ? (
                            <p className="mt-2 truncate text-[11px] text-white/80">
                              Selected: <span className="font-semibold">{contractFile.name}</span>{' '}
                              <span className="text-white/60">
                                ({(contractFile.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {stageProjection?.primaryAction?.key === 'send_for_signature' && detail.contract ? (
                      <button
                        type="button"
                        disabled={pendingAction === 'contract-send'}
                        onClick={() =>
                          void runAction('contract-send', async () => {
                            await patchContractStatus(detail.contract!.id, 'sent_for_signature');
                          })
                        }
                        className="mt-3 cursor-pointer rounded-lg bg-nilink-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        Send For Signature
                      </button>
                    ) : null}
                    {stageProjection?.primaryAction?.key === 'activate_deal' ? (
                      <button
                        type="button"
                        disabled={pendingAction === 'deal-active'}
                        onClick={() =>
                          void runAction('deal-active', async () => {
                            await patchDealStatus(detail.deal.id, 'active');
                          })
                        }
                        className="mt-3 cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Finalize And Start Deal
                      </button>
                    ) : null}
                    {stageProjection?.primaryAction?.key === 'move_to_payment' ? (
                      <button
                        type="button"
                        disabled={pendingAction === 'deal-payment'}
                        onClick={() =>
                          void runAction('deal-payment', async () => {
                            await patchDealStatus(detail.deal.id, 'payment_pending');
                            if (detail.payment) {
                              await patchPaymentStatus((detail.payment as ApiPayment).id, 'manual', { provider: 'manual' });
                            }
                          })
                        }
                        className="mt-3 cursor-pointer rounded-lg bg-nilink-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-nilink-accent-hover disabled:opacity-50"
                      >
                        Move To Payout
                      </button>
                    ) : null}
                    {stageProjection?.primaryAction?.key === 'mark_payment_paid' && detail.payment ? (
                      <div className="mt-3 space-y-2">
                        <input
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
                          placeholder="Payout reference or note"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={pendingAction === 'payment-paid'}
                          onClick={() =>
                            void runAction('payment-paid', async () => {
                              await patchPaymentStatus((detail.payment as ApiPayment).id, 'paid', {
                                provider: 'manual',
                                providerReference: paymentReference.trim(),
                              });
                              setPaymentReference('');
                            })
                          }
                          className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Mark As Paid
                        </button>
                      </div>
                    ) : null}
                    {stageProjection?.primaryAction?.key === 'close_deal' ? (
                      <button
                        type="button"
                        disabled={pendingAction === 'deal-close'}
                        onClick={() =>
                          void runAction('deal-close', async () => {
                            await patchDealStatus(detail.deal.id, 'closed');
                          })
                        }
                        className="mt-3 cursor-pointer rounded-lg bg-nilink-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        Close Deal
                      </button>
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
                    {detail.deal.status === 'cancellation_requested' ? (
                      cancellationRequester === 'brand' ? (
                        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                          <p className="text-xs font-medium text-yellow-800">Cancellation Requested</p>
                          <p className="mt-1 text-xs text-yellow-700">Awaiting the athlete&apos;s response.</p>
                        </div>
                      ) : (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-800">Cancellation Requested</p>
                        <p className="mt-1 text-xs text-red-700">The athlete has requested to cancel this deal. Accept to close it or dispute to escalate.</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={pendingAction === 'cancel-accept'}
                            onClick={() =>
                              void runAction('cancel-accept', async () => {
                                await respondToDealCancellation(detail.deal.id, 'accept');
                              })
                            }
                            className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Accept Cancellation
                          </button>
                          <button
                            type="button"
                            disabled={pendingAction === 'cancel-dispute'}
                            onClick={() =>
                              void runAction('cancel-dispute', async () => {
                                await respondToDealCancellation(detail.deal.id, 'dispute');
                              })
                            }
                            className="cursor-pointer rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                          >
                            Dispute
                          </button>
                        </div>
                      </div>
                      )
                    ) : !['cancelled', 'closed', 'disputed', 'paid'].includes(detail.deal.status) && showCancelModal ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-800">
                          {detail.deal.status === 'created' || detail.deal.status === 'contract_pending'
                            ? 'Cancel this deal?'
                            : 'Request Cancellation'}
                        </p>
                        <p className="mt-1 text-xs text-red-700">
                          {detail.deal.status === 'created' || detail.deal.status === 'contract_pending'
                            ? 'This will immediately cancel the deal. This cannot be undone.'
                            : 'Post-contract cancellation requires the athlete to accept. Provide a reason.'}
                        </p>
                        <textarea
                          className="mt-2 w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                          rows={2}
                          placeholder="Reason for cancellation…"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={pendingAction === 'cancel-request' || !cancelReason.trim()}
                            onClick={() =>
                              void runAction('cancel-request', async () => {
                                await requestDealCancellation(detail.deal.id, cancelReason.trim());
                                setShowCancelModal(false);
                                setCancelReason('');
                              })
                            }
                            className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {detail.deal.status === 'created' || detail.deal.status === 'contract_pending'
                              ? 'Confirm Cancel'
                              : 'Send Request'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                            className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            Back
                          </button>
                        </div>
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
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700">
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
                                Approve Submission
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

          {/* Cancel deal — only shown for non-terminal states */}
          {!['cancelled', 'closed', 'disputed', 'paid', 'cancellation_requested'].includes(detail.deal.status) && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-red-500 hover:underline"
              >
                Cancel this deal…
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
