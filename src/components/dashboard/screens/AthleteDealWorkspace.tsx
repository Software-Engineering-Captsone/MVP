'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  FileX2,
  Lock,
  Loader2,
  MessageSquare,
  Package,
  Pencil,
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import {
  activitySummary,
  compensationAmountFromDealSnapshot,
  createDeliverableSubmission,
  fetchDealDetail,
  fetchSubmissionsForDeliverable,
  formatIsoDate,
  parseTermsSnapshot,
  patchContractStatus,
  patchDeliverable,
  requestDealCancellation,
  respondToDealCancellation,
  type ApiDealDetail,
  type ApiSubmission,
} from '@/lib/deals/dashboardDealsClient';
import {
  buildDealStageProjection,
  buildDeliverableProjection,
  filterMainTimelineActivities,
  paymentStatusCopy,
  STAGE_LABELS,
  STAGE_ORDER,
  type DealStageId,
} from '@/lib/deals/stageProjection';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

type SubmitForm = { url: string; body: string; notes: string };

function ProgressTracker({ stageId, cancelled }: { stageId: DealStageId; cancelled?: boolean }) {
  const currentIndex = STAGE_ORDER.indexOf(stageId);
  return (
    <div className="flex items-start justify-between gap-1.5 sm:gap-2.5">
      {STAGE_ORDER.map((step, i) => {
        const isDone = !cancelled && i < currentIndex;
        const isCurrent = !cancelled && i === currentIndex;
        const circleLg = isCurrent && !cancelled;
        return (
          <div key={step} className={`flex min-w-0 flex-1 flex-col items-center ${circleLg ? 'gap-2.5' : 'gap-2'}`}>
            {/* Fixed-height row so connector lines share the same vertical axis across steps (circles vary 7↔10). */}
            <div className="flex h-10 w-full items-center">
              {/* Left connector line */}
              <div className={`h-px flex-1 ${i === 0 ? 'invisible' : isDone || isCurrent ? 'bg-nilink-accent' : 'bg-white/20'}`} />
              {/* Circle */}
              <div
                className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
                  circleLg ? 'h-10 w-10 text-base ring-[3px] ring-nilink-accent/25' : 'h-7 w-7 text-xs'
                } ${
                  cancelled
                    ? 'bg-white/10 text-white/30'
                    : isDone
                      ? 'bg-nilink-accent text-white'
                      : isCurrent
                        ? 'bg-nilink-accent text-white'
                        : 'bg-white/10 text-white/40'
                }`}
              >
                {cancelled ? '×' : isDone ? (
                  <svg className={circleLg ? 'h-4 w-4' : 'h-3.5 w-3.5'} viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {/* Right connector line */}
              <div className={`h-px flex-1 ${i === STAGE_ORDER.length - 1 ? 'invisible' : isDone ? 'bg-nilink-accent' : 'bg-white/20'}`} />
            </div>
            {/* Label below circle — full text, no truncation, no uppercase */}
            <span
              className={`text-center leading-tight ${
                circleLg ? 'text-sm font-bold text-white' : 'text-[11px]'
              } ${
                cancelled ? 'text-white/30'
                  : isCurrent
                    ? ''
                    : isDone
                      ? 'text-white/60'
                      : 'text-white/30'
              }`}
            >
              {STAGE_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AthleteDealWorkspace({ dealId }: { dealId: string }) {
  const [detail, setDetail] = useState<ApiDealDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submissionsByDeliverable, setSubmissionsByDeliverable] = useState<Record<string, ApiSubmission[]>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [contractAgreementChecked, setContractAgreementChecked] = useState(false);
  const [submitForms, setSubmitForms] = useState<Record<string, SubmitForm>>({});
  const [submitErrors, setSubmitErrors] = useState<Record<string, string | null>>({});
  const deliverablesRef = useRef<HTMLDivElement | null>(null);

  const loadDetail = useCallback(async () => {
    setDetailLoading(true);
    setDetailError(null);
    setActionError(null);
    try {
      const d = await fetchDealDetail(dealId);
      setDetail(d);
      const subMap: Record<string, ApiSubmission[]> = {};
      await Promise.all(
        d.deliverables.map(async (deliverable) => {
          try {
            subMap[deliverable.id] = await fetchSubmissionsForDeliverable(deliverable.id);
          } catch {
            subMap[deliverable.id] = [];
          }
        }),
      );
      setSubmissionsByDeliverable(subMap);
      const forms: Record<string, SubmitForm> = {};
      for (const deliverable of d.deliverables) {
        forms[deliverable.id] = { url: '', body: '', notes: '' };
      }
      setSubmitForms(forms);
      setSubmitErrors({});
    } catch (e) {
      setDetail(null);
      setDetailError(e instanceof Error ? e.message : 'Could not load deal');
      setSubmissionsByDeliverable({});
    } finally {
      setDetailLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useDealsRealtimeRefresh({ enabled: true, dealId, onInvalidate: loadDetail });

  useEffect(() => {
    setContractAgreementChecked(false);
  }, [detail?.contract?.id, detail?.contract?.status]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setPendingKey(key);
    setActionError(null);
    try {
      await fn();
      await loadDetail();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPendingKey(null);
    }
  };

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

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const cancellationRequester = useMemo(() => {
    if (!detail || detail.deal.status !== 'cancellation_requested') return null;
    const act = [...(detail.activities ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((a) => a.eventType === 'cancellation_requested');
    return (act?.metadata?.requestedByRole as string | undefined) ?? (act?.actorType ?? null);
  }, [detail]);

  const terms = detail ? parseTermsSnapshot(detail.deal.termsSnapshot) : null;
  const brandName = detail?.deal.brandName?.trim() || 'Brand';
  const compensationAmount = detail ? compensationAmountFromDealSnapshot(detail.deal.termsSnapshot) : 0;
  const compensationLine =
    terms?.compensationLine ||
    (compensationAmount > 0 ? `USD ${compensationAmount.toLocaleString()}` : 'Compensation per agreed offer');
  const title = brandName;
  const workspaceSubtitle = [
    detail?.deal.campaignName?.trim() || null,
    compensationLine,
  ]
    .filter(Boolean)
    .join(' · ');
  const deliverableCount = terms?.frozenDeliverables.length || detail?.deliverables.length || 0;
  const deliverableCountLine = `${deliverableCount} deliverable${deliverableCount === 1 ? '' : 's'}`;

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
        <Link href="/dashboard/deals" className="inline-flex items-center gap-2 text-sm font-semibold text-nilink-accent hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to deals
        </Link>
        <p className="mt-6 text-sm text-red-600">{detailError || 'Deal not found'}</p>
      </div>
    );
  }

  // Inline helper: map stageId to a lucide icon
  function stageIconFor(id: DealStageId) {
    const map: Record<DealStageId, React.ReactNode> = {
      agreement: <FileText className="h-5 w-5" />,
      work_in_progress: <Pencil className="h-5 w-5" />,
      review_revisions: <CheckSquare className="h-5 w-5" />,
      completed: <Package className="h-5 w-5" />,
      payment: <DollarSign className="h-5 w-5" />,
      closed: <Lock className="h-5 w-5" />,
    };
    return map[id] ?? <FileText className="h-5 w-5" />;
  }

  // Latest activity metadata
  const filteredActivities = filterMainTimelineActivities(detail.activities)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestActivity = filteredActivities[0] ?? null;
  const latestActivityLabel = latestActivity
    ? `${latestActivity.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} · ${new Date(latestActivity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    : null;

  const deal = detail.deal;
  const compensation = compensationAmount > 0 ? compensationAmount.toLocaleString() : null;

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col bg-nilink-page">
      <div className="dash-main-gutter-x flex flex-1 flex-col pb-24 pt-8 sm:pb-28">

        {/* ── 1. BACK LINK + DEAL HEADER ── */}
        <div className="mb-6">
          <Link href="/dashboard/deals" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" />
            Back to deals
          </Link>
        </div>

        <div className="mb-4">
          <h1 className="text-3xl font-black tracking-tight text-nilink-ink">
            {deal.brandName?.toUpperCase()}<span className="text-nilink-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {deal.campaignName}
            {compensation && ` · $${compensation}`}
            {detail.deliverables.length > 0 && ` · ${detail.deliverables.length} deliverable${detail.deliverables.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Inline error banner */}
        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {actionError}
          </div>
        )}

        {/* ── 2. STATUS + PROGRESS CARD ── */}
        {stageProjection && (
          <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-nilink-sidebar via-[#2a2a2d] to-nilink-sidebar shadow-xl shadow-black/25 ring-1 ring-inset ring-white/[0.07]">
            <div className="relative px-7 py-8 sm:px-9 sm:py-9">
              {detailLoading ? (
                <div
                  className="pointer-events-none absolute right-7 top-8 z-10 flex h-6 items-center sm:right-9 sm:top-8"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/55" aria-hidden />
                  <span className="sr-only">Refreshing</span>
                </div>
              ) : null}

              {/* Next-action badge (stage name lives on the highlighted stepper step) */}
              <div className="flex flex-wrap items-center justify-start gap-3">
                {deal.status === 'cancelled' ? (
                  <p className="text-lg font-bold tracking-tight text-white">Deal cancelled</p>
                ) : null}
                {deal.status !== 'cancelled' ? (
                  <span
                    className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide ${
                      deal.nextActionOwner === 'athlete'
                        ? 'border border-emerald-400/30 bg-emerald-500/20 text-emerald-200'
                        : 'border border-white/20 bg-white/10 text-white/60'
                    }`}
                  >
                    {deal.nextActionOwner === 'athlete'
                      ? 'Your turn'
                      : deal.nextActionOwner === 'brand'
                        ? 'Waiting on brand'
                        : 'Processing'}
                  </span>
                ) : null}
              </div>

              {/* Progress stepper */}
              <div className="mt-8 sm:mt-9">
                <ProgressTracker stageId={stageProjection.stageId} cancelled={deal.status === 'cancelled'} />
              </div>

              {/* Metadata row */}
              <div className="mt-8 flex flex-col gap-5 border-t border-white/[0.12] pt-7 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:pt-8">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug text-white/55">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-nilink-accent ring-2 ring-nilink-accent/25" />
                  <span className="font-medium text-white/70">Current status</span>
                  <span className="text-white/90">{stageProjection.statusLine}</span>
                </div>
                {latestActivity && latestActivityLabel && (
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug text-white/55 sm:justify-end">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span className="font-medium text-white/70">Latest activity</span>
                    <span className="text-white/90">{latestActivityLabel}</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── 3. CURRENT-STEP WORKSPACE CARD ── */}
        {stageProjection?.stageId === 'agreement' ? (
          // 3A — Agreement step
          (() => {
            const contractStatus = detail.contract?.status ?? 'not_added';

            if (contractStatus === 'not_added') {
              return (
                <div className="mb-4 flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 shadow-sm sm:min-h-[280px] sm:p-14">
                  <div className="flex max-w-lg flex-col items-center justify-center text-center">
                    <div
                      className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-200/80 bg-gray-50 text-gray-400 sm:h-24 sm:w-24"
                      aria-hidden
                    >
                      <FileX2 className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.25} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-nilink-ink sm:text-2xl">Contract not added yet</h3>
                    <p className="mt-3 text-base leading-relaxed text-gray-500 sm:text-[17px]">
                      The brand has not uploaded the contract yet. You&apos;ll be notified when it&apos;s ready.
                    </p>
                  </div>
                </div>
              );
            }

            if (contractStatus === 'uploaded') {
              return (
                <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-nilink-ink">Contract status</h3>
                  <p className="mt-1 text-sm text-gray-500">{deal.brandName} needs to send the uploaded contract before you can review and sign it.</p>

                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nilink-accent/10 text-nilink-accent">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-nilink-ink">Contract uploaded</span>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">Not sent yet</span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">Signature request has not been sent.</p>
                        </div>
                      </div>
                      <button className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <MessageSquare className="h-3.5 w-3.5" /> Message brand
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-gray-400">You&apos;ll be notified as soon as the contract is ready for signature.</p>
                </div>
              );
            }

            if (contractStatus === 'sent_for_signature') {
              return (
                <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-nilink-ink">Review and sign contract</h3>
                  <p className="mt-1 text-sm text-gray-500">Review and sign the contract to move the deal into Work in Progress.</p>

                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nilink-accent/10 text-nilink-accent">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-nilink-ink">Contract document</span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">Awaiting signature</span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">Sent for your signature.</p>
                        </div>
                      </div>
                      {detail.contract?.fileUrl?.trim() && (
                        <a
                          href={detail.contract.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Open contract
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Sign contract block */}
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    {detail.contract?.fileUrl?.trim() ? (
                      <a
                        href={detail.contract.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm font-semibold text-nilink-accent hover:underline"
                      >
                        Open contract
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-amber-900">
                        Contract document is not yet available - contact the brand.
                      </p>
                    )}
                    <label className={`mt-3 flex items-start gap-2 text-sm ${detail.contract?.fileUrl?.trim() ? 'text-gray-700' : 'text-gray-400'}`}>
                      <input
                        type="checkbox"
                        checked={contractAgreementChecked}
                        disabled={!detail.contract?.fileUrl?.trim()}
                        onChange={(e) => setContractAgreementChecked(e.target.checked)}
                        className="mt-1"
                      />
                      I have reviewed this contract and agree to proceed with this deal.
                    </label>
                    <button
                      type="button"
                      disabled={pendingKey === 'sign' || !contractAgreementChecked || !detail.contract?.fileUrl?.trim()}
                      onClick={() =>
                        void run('sign', async () => {
                          if (!detail.contract?.fileUrl?.trim()) return;
                          await patchContractStatus(detail.contract!.id, 'signed');
                        })
                      }
                      className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Sign contract
                    </button>
                  </div>
                </div>
              );
            }

            if (contractStatus === 'signed') {
              return (
                <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-emerald-900">Agreement complete</h3>
                  </div>
                  <p className="mt-1 text-sm text-emerald-700">The agreement is signed. This deal is moving into Work in Progress.</p>
                </div>
              );
            }

            // Fallback for any other contract status
            return null;
          })()
        ) : (
          // 3B — All other stages
          <div className="mb-4 space-y-4">
            {/* === CLOSED STATE === */}
            {deal.status === 'closed' ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-nilink-ink">Deal complete</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This collaboration is finished. No further action is required.
                </p>

                {/* Completion summary — compact checklist */}
                <div className="mt-5 space-y-2">
                  {[
                    'Agreement signed',
                    'Deliverable completed',
                    'Payout finalized',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                        <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Latest deliverable — compact row, only if deliverables exist */}
                {detail.deliverables.length > 0 && (() => {
                  const d = detail.deliverables[0];
                  const subs = submissionsByDeliverable[d.id] ?? [];
                  const latestSub = subs.filter(s => s.status === 'approved').sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
                    ?? subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
                  return (
                    <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Latest deliverable</p>
                      <p className="text-sm font-semibold text-nilink-ink">{d.title}</p>
                      {latestSub && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {latestSub.status.charAt(0).toUpperCase() + latestSub.status.slice(1).replace(/_/g, ' ')}
                          {' · '}
                          {new Date(latestSub.submittedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: 'numeric', minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* View activity link */}
                <div className="mt-4">
                  <button className="text-sm text-nilink-accent hover:underline">
                    View activity
                  </button>
                </div>
              </div>
            ) : deal.status === 'cancelled' ? (
              /* === CANCELLED STATE === */
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6 shadow-sm">
                <h3 className="text-base font-bold text-red-900">Deal cancelled</h3>
                <p className="mt-1 text-sm text-red-700">
                  This deal has been cancelled and is no longer active.
                </p>
                {(() => {
                  const cancelActivity = detail.activities.find(a => a.eventType === 'deal_cancelled' || a.eventType === 'cancellation_accepted');
                  const reason = cancelActivity?.metadata?.reason ?? cancelActivity?.metadata?.note ?? null;
                  return reason ? (
                    <p className="mt-3 text-sm text-red-600 italic">&ldquo;{reason as string}&rdquo;</p>
                  ) : null;
                })()}
              </div>
            ) : (
              /* === ACTIVE STAGE-SPECIFIC WORKSPACE CARDS === */
              <div className="space-y-4">
                {stageProjection?.stageId === 'work_in_progress' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-bold text-nilink-ink">Submit your work</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Complete and submit your deliverables for review.
                    </p>
                    <div ref={deliverablesRef} className="mt-5 space-y-6">
                      {detail.deliverables.map((deliverable) => {
                        const submissions = (submissionsByDeliverable[deliverable.id] ?? []).slice().sort((a, b) => a.version - b.version);
                        const form = submitForms[deliverable.id] ?? { url: '', body: '', notes: '' };
                        const projection = buildDeliverableProjection({
                          actor: 'athlete',
                          deliverable,
                          submissionsByDeliverable,
                        });
                        return (
                          <div key={deliverable.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-nilink-ink">{deliverable.title}</p>
                                <p className="text-xs text-gray-500">
                                  Due {deliverable.dueAt ? formatIsoDate(deliverable.dueAt) : 'TBD'} · Revisions{' '}
                                  {deliverable.revisionCountUsed}/{deliverable.revisionLimit}
                                </p>
                              </div>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                                {projection.statusLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">{deliverable.instructions}</p>
                            <p className="mt-2 text-xs text-gray-500">
                              Latest: {projection.latestSubmissionLabel}
                              {projection.latestSubmissionAt ? ` · ${formatIsoDate(projection.latestSubmissionAt)}` : ''}
                            </p>
                            {projection.feedback ? (
                              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                Brand feedback: {projection.feedback}
                              </p>
                            ) : null}

                            {submissions.length > 1 ? (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-[11px] font-bold uppercase text-gray-500">
                                  View submission history ({submissions.length})
                                </summary>
                                <ul className="mt-2 space-y-2">
                                  {submissions.map((submission) => (
                                    <li key={submission.id} className="rounded-lg bg-gray-50 p-2 text-sm">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-semibold text-nilink-ink">
                                          v{submission.version}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatIsoDate(submission.submittedAt)}</span>
                                      </div>
                                      {submission.notes ? <p className="mt-1 text-xs text-gray-600">{submission.notes}</p> : null}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : null}

                            {projection.primaryAction?.key === 'submit_work' ? (
                              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-3">
                                <p className="text-xs font-bold uppercase text-gray-500">{projection.primaryAction.label}</p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [deliverable.id]: { ...form, body: 'Submitting work as described in the deal terms.' },
                                    }))
                                  }
                                  className="mt-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                  Use template
                                </button>
                                <input
                                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  placeholder="Link (optional)"
                                  value={form.url}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [deliverable.id]: { ...form, url: e.target.value },
                                    }))
                                  }
                                />
                                <textarea
                                  className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${
                                    submitErrors[deliverable.id] ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                                  }`}
                                  rows={3}
                                  placeholder="Describe what you are submitting..."
                                  value={form.body}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [deliverable.id]: { ...form, body: e.target.value },
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
                                      [deliverable.id]: { ...form, notes: e.target.value },
                                    }))
                                  }
                                />
                                {submitErrors[deliverable.id] ? (
                                  <p className="mt-2 text-xs font-semibold text-red-700">{submitErrors[deliverable.id]}</p>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={pendingKey === `sub-${deliverable.id}`}
                                  onClick={() =>
                                    void run(`sub-${deliverable.id}`, async () => {
                                      const bodyText = form.body.trim();
                                      const urlText = form.url.trim();
                                      if (!bodyText) {
                                        setSubmitErrors((prev) => ({
                                          ...prev,
                                          [deliverable.id]: 'Add a short summary of what you are submitting.',
                                        }));
                                        return;
                                      }
                                      setSubmitErrors((prev) => ({ ...prev, [deliverable.id]: null }));
                                      await createDeliverableSubmission(deliverable.id, {
                                        body: bodyText,
                                        notes: form.notes,
                                        artifacts: urlText ? [{ kind: 'url', ref: urlText }] : undefined,
                                      });
                                    })
                                  }
                                  className="mt-3 w-full rounded-xl bg-nilink-ink py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                >
                                  Send submission
                                </button>
                              </div>
                            ) : projection.primaryAction?.key === 'mark_published' ? (
                              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <p className="text-xs font-bold uppercase text-emerald-800">Content approved — publish it</p>
                                <p className="mt-1 text-xs text-emerald-700">
                                  Post your content on the agreed platform, then mark it as published to complete this deliverable.
                                </p>
                                <button
                                  type="button"
                                  disabled={pendingKey === `pub-${deliverable.id}`}
                                  onClick={() =>
                                    void run(`pub-${deliverable.id}`, async () => {
                                      await patchDeliverable(deliverable.id, { status: 'published' });
                                    })
                                  }
                                  className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Mark as Published
                                </button>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-gray-400">No athlete action needed for this deliverable right now.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Cancellation UI */}
                    {deal.status === 'cancellation_requested' && (
                      <div className="mt-5 border-t border-gray-100 pt-5">
                        {cancellationRequester === 'athlete' ? (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                            <p className="text-sm font-medium text-yellow-800">Cancellation Requested</p>
                            <p className="mt-1 text-sm text-yellow-700">Awaiting the brand&apos;s response.</p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-bold text-red-800">Cancellation Requested</p>
                            <p className="mt-1 text-sm text-red-700">The brand has requested to cancel this deal. Accept to close it or dispute to escalate.</p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                disabled={pendingKey === 'cancel-accept'}
                                onClick={() =>
                                  void run('cancel-accept', async () => {
                                    await respondToDealCancellation(detail.deal.id, 'accept');
                                  })
                                }
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Accept Cancellation
                              </button>
                              <button
                                type="button"
                                disabled={pendingKey === 'cancel-dispute'}
                                onClick={() =>
                                  void run('cancel-dispute', async () => {
                                    await respondToDealCancellation(detail.deal.id, 'dispute');
                                  })
                                }
                                className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-50 disabled:opacity-50"
                              >
                                Dispute
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {stageProjection?.stageId === 'review_revisions' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-bold text-nilink-ink">
                      {deal.status === 'revision_requested' ? 'Revision requested' : 'Submission under review'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {deal.status === 'revision_requested'
                        ? 'The brand has requested changes. Review their feedback and resubmit.'
                        : 'Your submission is being reviewed by the brand.'}
                    </p>
                    <div ref={deliverablesRef} className="mt-5 space-y-6">
                      {detail.deliverables.map((deliverable) => {
                        const submissions = (submissionsByDeliverable[deliverable.id] ?? []).slice().sort((a, b) => a.version - b.version);
                        const form = submitForms[deliverable.id] ?? { url: '', body: '', notes: '' };
                        const projection = buildDeliverableProjection({
                          actor: 'athlete',
                          deliverable,
                          submissionsByDeliverable,
                        });
                        return (
                          <div key={deliverable.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-nilink-ink">{deliverable.title}</p>
                                <p className="text-xs text-gray-500">
                                  Due {deliverable.dueAt ? formatIsoDate(deliverable.dueAt) : 'TBD'} · Revisions{' '}
                                  {deliverable.revisionCountUsed}/{deliverable.revisionLimit}
                                </p>
                              </div>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                                {projection.statusLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">{deliverable.instructions}</p>
                            <p className="mt-2 text-xs text-gray-500">
                              Latest: {projection.latestSubmissionLabel}
                              {projection.latestSubmissionAt ? ` · ${formatIsoDate(projection.latestSubmissionAt)}` : ''}
                            </p>
                            {projection.feedback ? (
                              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                Brand feedback: {projection.feedback}
                              </p>
                            ) : null}

                            {submissions.length > 1 ? (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-[11px] font-bold uppercase text-gray-500">
                                  View submission history ({submissions.length})
                                </summary>
                                <ul className="mt-2 space-y-2">
                                  {submissions.map((submission) => (
                                    <li key={submission.id} className="rounded-lg bg-gray-50 p-2 text-sm">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-semibold text-nilink-ink">
                                          v{submission.version}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatIsoDate(submission.submittedAt)}</span>
                                      </div>
                                      {submission.notes ? <p className="mt-1 text-xs text-gray-600">{submission.notes}</p> : null}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : null}

                            {projection.primaryAction?.key === 'submit_work' ? (
                              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-3">
                                <p className="text-xs font-bold uppercase text-gray-500">{projection.primaryAction.label}</p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [deliverable.id]: { ...form, body: 'Submitting work as described in the deal terms.' },
                                    }))
                                  }
                                  className="mt-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                  Use template
                                </button>
                                <input
                                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  placeholder="Link (optional)"
                                  value={form.url}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [deliverable.id]: { ...form, url: e.target.value },
                                    }))
                                  }
                                />
                                <textarea
                                  className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${
                                    submitErrors[deliverable.id] ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                                  }`}
                                  rows={3}
                                  placeholder="Describe what you are submitting..."
                                  value={form.body}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [deliverable.id]: { ...form, body: e.target.value },
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
                                      [deliverable.id]: { ...form, notes: e.target.value },
                                    }))
                                  }
                                />
                                {submitErrors[deliverable.id] ? (
                                  <p className="mt-2 text-xs font-semibold text-red-700">{submitErrors[deliverable.id]}</p>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={pendingKey === `sub-${deliverable.id}`}
                                  onClick={() =>
                                    void run(`sub-${deliverable.id}`, async () => {
                                      const bodyText = form.body.trim();
                                      const urlText = form.url.trim();
                                      if (!bodyText) {
                                        setSubmitErrors((prev) => ({
                                          ...prev,
                                          [deliverable.id]: 'Add a short summary of what you are submitting.',
                                        }));
                                        return;
                                      }
                                      setSubmitErrors((prev) => ({ ...prev, [deliverable.id]: null }));
                                      await createDeliverableSubmission(deliverable.id, {
                                        body: bodyText,
                                        notes: form.notes,
                                        artifacts: urlText ? [{ kind: 'url', ref: urlText }] : undefined,
                                      });
                                    })
                                  }
                                  className="mt-3 w-full rounded-xl bg-nilink-ink py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                >
                                  Send submission
                                </button>
                              </div>
                            ) : projection.primaryAction?.key === 'mark_published' ? (
                              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <p className="text-xs font-bold uppercase text-emerald-800">Content approved — publish it</p>
                                <p className="mt-1 text-xs text-emerald-700">
                                  Post your content on the agreed platform, then mark it as published to complete this deliverable.
                                </p>
                                <button
                                  type="button"
                                  disabled={pendingKey === `pub-${deliverable.id}`}
                                  onClick={() =>
                                    void run(`pub-${deliverable.id}`, async () => {
                                      await patchDeliverable(deliverable.id, { status: 'published' });
                                    })
                                  }
                                  className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Mark as Published
                                </button>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-gray-400">No athlete action needed for this deliverable right now.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Cancellation UI */}
                    {deal.status === 'cancellation_requested' && (
                      <div className="mt-5 border-t border-gray-100 pt-5">
                        {cancellationRequester === 'athlete' ? (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                            <p className="text-sm font-medium text-yellow-800">Cancellation Requested</p>
                            <p className="mt-1 text-sm text-yellow-700">Awaiting the brand&apos;s response.</p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-bold text-red-800">Cancellation Requested</p>
                            <p className="mt-1 text-sm text-red-700">The brand has requested to cancel this deal. Accept to close it or dispute to escalate.</p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                disabled={pendingKey === 'cancel-accept'}
                                onClick={() =>
                                  void run('cancel-accept', async () => {
                                    await respondToDealCancellation(detail.deal.id, 'accept');
                                  })
                                }
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Accept Cancellation
                              </button>
                              <button
                                type="button"
                                disabled={pendingKey === 'cancel-dispute'}
                                onClick={() =>
                                  void run('cancel-dispute', async () => {
                                    await respondToDealCancellation(detail.deal.id, 'dispute');
                                  })
                                }
                                className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-50 disabled:opacity-50"
                              >
                                Dispute
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {stageProjection?.stageId === 'completed' && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-base font-bold text-emerald-900">Deliverables approved</h3>
                    </div>
                    <p className="mt-1 text-sm text-emerald-700">
                      Your work has been approved. Waiting for the brand to initiate the payout.
                    </p>
                  </div>
                )}

                {stageProjection?.stageId === 'payment' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-bold text-nilink-ink">Payout processing</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      The brand is processing your payout.
                    </p>
                    {detail.payment && (
                      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-sm font-semibold text-nilink-ink">
                          {detail.payment.currency} {detail.payment.amount.toLocaleString()}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {paymentStatusCopy(detail.payment.status)}
                          {detail.payment.paidAt ? ` · Paid ${new Date(detail.payment.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {stageProjection && !['work_in_progress', 'review_revisions', 'completed', 'payment'].includes(stageProjection.stageId) && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-bold text-nilink-ink">{stageProjection.stageLabel}</h3>
                    <p className="mt-1 text-sm text-gray-500">{stageProjection.stageDescription}</p>
                    {detail.deliverables.length > 0 && (
                      <div ref={deliverablesRef} className="mt-5 space-y-6">
                        {detail.deliverables.map((deliverable) => {
                          const submissions = (submissionsByDeliverable[deliverable.id] ?? []).slice().sort((a, b) => a.version - b.version);
                          const form = submitForms[deliverable.id] ?? { url: '', body: '', notes: '' };
                          const projection = buildDeliverableProjection({
                            actor: 'athlete',
                            deliverable,
                            submissionsByDeliverable,
                          });
                          return (
                            <div key={deliverable.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-nilink-ink">{deliverable.title}</p>
                                  <p className="text-xs text-gray-500">
                                    Due {deliverable.dueAt ? formatIsoDate(deliverable.dueAt) : 'TBD'} · Revisions{' '}
                                    {deliverable.revisionCountUsed}/{deliverable.revisionLimit}
                                  </p>
                                </div>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                                  {projection.statusLabel}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-relaxed text-gray-600">{deliverable.instructions}</p>
                              <p className="mt-2 text-xs text-gray-500">
                                Latest: {projection.latestSubmissionLabel}
                                {projection.latestSubmissionAt ? ` · ${formatIsoDate(projection.latestSubmissionAt)}` : ''}
                              </p>
                              {projection.feedback ? (
                                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                  Brand feedback: {projection.feedback}
                                </p>
                              ) : null}

                              {submissions.length > 1 ? (
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-[11px] font-bold uppercase text-gray-500">
                                    View submission history ({submissions.length})
                                  </summary>
                                  <ul className="mt-2 space-y-2">
                                    {submissions.map((submission) => (
                                      <li key={submission.id} className="rounded-lg bg-gray-50 p-2 text-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="font-semibold text-nilink-ink">
                                            v{submission.version}
                                          </span>
                                          <span className="text-xs text-gray-400">{formatIsoDate(submission.submittedAt)}</span>
                                        </div>
                                        {submission.notes ? <p className="mt-1 text-xs text-gray-600">{submission.notes}</p> : null}
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              ) : null}

                              {projection.primaryAction?.key === 'submit_work' ? (
                                <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-3">
                                  <p className="text-xs font-bold uppercase text-gray-500">{projection.primaryAction.label}</p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSubmitForms((prev) => ({
                                        ...prev,
                                        [deliverable.id]: { ...form, body: 'Submitting work as described in the deal terms.' },
                                      }))
                                    }
                                    className="mt-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                                  >
                                    Use template
                                  </button>
                                  <input
                                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    placeholder="Link (optional)"
                                    value={form.url}
                                    onChange={(e) =>
                                      setSubmitForms((prev) => ({
                                        ...prev,
                                        [deliverable.id]: { ...form, url: e.target.value },
                                      }))
                                    }
                                  />
                                  <textarea
                                    className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${
                                      submitErrors[deliverable.id] ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                                    }`}
                                    rows={3}
                                    placeholder="Describe what you are submitting..."
                                    value={form.body}
                                    onChange={(e) =>
                                      setSubmitForms((prev) => ({
                                        ...prev,
                                        [deliverable.id]: { ...form, body: e.target.value },
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
                                        [deliverable.id]: { ...form, notes: e.target.value },
                                      }))
                                    }
                                  />
                                  {submitErrors[deliverable.id] ? (
                                    <p className="mt-2 text-xs font-semibold text-red-700">{submitErrors[deliverable.id]}</p>
                                  ) : null}
                                  <button
                                    type="button"
                                    disabled={pendingKey === `sub-${deliverable.id}`}
                                    onClick={() =>
                                      void run(`sub-${deliverable.id}`, async () => {
                                        const bodyText = form.body.trim();
                                        const urlText = form.url.trim();
                                        if (!bodyText) {
                                          setSubmitErrors((prev) => ({
                                            ...prev,
                                            [deliverable.id]: 'Add a short summary of what you are submitting.',
                                          }));
                                          return;
                                        }
                                        setSubmitErrors((prev) => ({ ...prev, [deliverable.id]: null }));
                                        await createDeliverableSubmission(deliverable.id, {
                                          body: bodyText,
                                          notes: form.notes,
                                          artifacts: urlText ? [{ kind: 'url', ref: urlText }] : undefined,
                                        });
                                      })
                                    }
                                    className="mt-3 w-full rounded-xl bg-nilink-ink py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                  >
                                    Send submission
                                  </button>
                                </div>
                              ) : projection.primaryAction?.key === 'mark_published' ? (
                                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                  <p className="text-xs font-bold uppercase text-emerald-800">Content approved — publish it</p>
                                  <p className="mt-1 text-xs text-emerald-700">
                                    Post your content on the agreed platform, then mark it as published to complete this deliverable.
                                  </p>
                                  <button
                                    type="button"
                                    disabled={pendingKey === `pub-${deliverable.id}`}
                                    onClick={() =>
                                      void run(`pub-${deliverable.id}`, async () => {
                                        await patchDeliverable(deliverable.id, { status: 'published' });
                                      })
                                    }
                                    className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Mark as Published
                                  </button>
                                </div>
                              ) : (
                                <p className="mt-3 text-xs text-gray-400">No athlete action needed for this deliverable right now.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 5. FOOTER ACTIONS ── */}
        {/* Cancellation request form — only in non-terminal states */}
        {!['cancelled', 'closed', 'disputed', 'paid', 'created', 'contract_pending'].includes(deal.status) && showCancelModal && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">Request Cancellation</p>
            <p className="mt-1 text-sm text-red-700">The brand will need to accept your cancellation request before the deal is closed.</p>
            <textarea
              className="mt-3 w-full rounded-xl border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              rows={2}
              placeholder="Reason for requesting cancellation…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pendingKey === 'cancel-request' || !cancelReason.trim()}
                onClick={() =>
                  void run('cancel-request', async () => {
                    await requestDealCancellation(detail.deal.id, cancelReason.trim());
                    setShowCancelModal(false);
                    setCancelReason('');
                  })
                }
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Send Request
              </button>
              <button
                type="button"
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {!['created', 'contract_pending', 'cancelled', 'closed', 'disputed', 'paid', 'cancellation_requested'].includes(deal.status) && !showCancelModal ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-xs text-red-500 hover:underline"
            >
              Request cancellation…
            </button>
          </div>
        ) : null}

      </div>

      <div
        className="pointer-events-none fixed bottom-0 left-20 right-0 z-20"
        role="contentinfo"
        aria-label="Deal shortcuts"
      >
        <div className="pointer-events-auto dash-main-gutter-x flex flex-wrap items-center justify-end gap-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            className="rounded-md border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 opacity-65 shadow-md ring-1 ring-black/5 transition-all hover:opacity-100 hover:border-gray-300 hover:text-gray-700 hover:shadow-lg"
          >
            View full deal terms
          </button>
          <button
            type="button"
            className="rounded-md border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 opacity-65 shadow-md ring-1 ring-black/5 transition-all hover:opacity-100 hover:border-gray-300 hover:text-gray-700 hover:shadow-lg"
          >
            View activity
          </button>
          {!['closed', 'cancelled'].includes(deal.status) && (
            <button
              type="button"
              className="rounded-md border-2 border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 opacity-65 shadow-md ring-1 ring-black/5 transition-all hover:opacity-100 hover:border-red-300 hover:text-red-600 hover:shadow-lg"
            >
              Report an issue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
