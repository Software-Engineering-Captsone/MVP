'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  Lock,
  Loader2,
  Package,
  Pencil,
  Send,
  Upload,
} from 'lucide-react';
import {
  activitySummary,
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
  filterMainTimelineActivities,
  STAGE_LABELS,
  STAGE_ORDER,
  type DealStageId,
} from '@/lib/deals/stageProjection';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

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

function nextTurnHeadline(owner: ApiDeal['nextActionOwner']): { label: string; className: string } {
  const base = 'rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide';
  if (owner === 'brand') {
    return {
      label: 'Your turn',
      className: `${base} border border-emerald-400/30 bg-emerald-500/20 text-emerald-200`,
    };
  }
  if (owner === 'athlete') {
    return {
      label: 'Waiting on athlete',
      className: `${base} border border-white/20 bg-white/10 text-white/60`,
    };
  }
  if (owner === 'system') {
    return {
      label: 'Processing',
      className: `${base} border border-white/20 bg-white/10 text-white/60`,
    };
  }
  return {
    label: 'Status',
    className: `${base} border border-white/20 bg-white/10 text-white/60`,
  };
}

function stageIconFor(id: DealStageId): React.ReactNode {
  const icons: Record<DealStageId, React.ReactNode> = {
    agreement: <FileText className="h-5 w-5" />,
    work_in_progress: <Pencil className="h-5 w-5" />,
    review_revisions: <CheckSquare className="h-5 w-5" />,
    completed: <Package className="h-5 w-5" />,
    payment: <DollarSign className="h-5 w-5" />,
    closed: <Lock className="h-5 w-5" />,
  };
  return icons[id] ?? <FileText className="h-5 w-5" />;
}

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
  const [contractUrlError, setContractUrlError] = useState<string | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const contractFilePrimaryRef = useRef<HTMLInputElement>(null);
  const [revisionFeedback, setRevisionFeedback] = useState<Record<string, string>>({});
  const [paymentReference, setPaymentReference] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReplaceContract, setShowReplaceContract] = useState(false);

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
      if (latest && latest.status === 'submitted') {
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

  // Derive compensation from termsSnapshot
  const compensation = (() => {
    try {
      const snap = typeof detail.deal.termsSnapshot === 'string'
        ? (JSON.parse(detail.deal.termsSnapshot) as Record<string, unknown>)
        : (detail.deal.termsSnapshot as Record<string, unknown> | null);
      return (snap?.compensationAmount as number | string | null | undefined) ?? null;
    } catch {
      return null;
    }
  })();

  // Latest main timeline activity
  const latestActivity = filterMainTimelineActivities(detail.activities ?? [])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const latestActivityLabel = latestActivity
    ? `${activitySummary(latestActivity)} · ${formatIsoDate(latestActivity.createdAt)}`
    : null;

  // Contract upload form (shared between "not_added" and "replace" scenarios)
  const contractUploadForm = (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5">
        <label
          htmlFor="contract-url-primary"
          className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sm:min-w-[7rem] sm:pt-0.5"
        >
          Contract link
        </label>
        <div className="flex min-h-[42px] min-w-0 flex-1 items-center rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:border-nilink-accent focus-within:ring-2 focus-within:ring-nilink-accent/20">
          <input
            id="contract-url-primary"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            placeholder="https://…"
            value={contractUrlInput}
            onChange={(e) => {
              setContractUrlInput(e.target.value);
              setContractUrlError(null);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">or</span>
      </div>

      <div>
        <label htmlFor="contract-file-primary" className="sr-only">
          Upload contract file (PDF or Word) if not using a URL
        </label>
        <div className="flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Upload className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <input
            id="contract-file-primary"
            ref={contractFilePrimaryRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="w-auto max-w-full min-w-0 text-sm text-gray-700 file:mr-2 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-50"
            onChange={(e) => {
              setContractUrlError(null);
              setContractFile(e.target.files?.[0] ?? null);
            }}
          />
        </div>
      </div>

      {contractUrlError ? (
        <p className="mt-3 text-sm font-medium text-amber-800" role="alert">
          {contractUrlError}
        </p>
      ) : null}

      <div className="mt-3 w-fit">
        <button
          type="button"
          aria-label="Save contract to this deal"
          disabled={pendingAction === 'contract-upload-primary' || (!contractUrlInput.trim() && !contractFile)}
          onClick={() => {
            const candidate = contractUrlInput.trim();
            if (!candidate && !contractFile) {
              setContractUrlError('Enter a URL or choose a file, then save.');
              return;
            }
            if (candidate && contractFile) {
              setContractUrlError('Use either a URL or a file — not both at once.');
              return;
            }
            if (candidate) {
              let parsed: URL;
              try {
                parsed = new URL(candidate);
              } catch {
                setContractUrlError('Enter a full URL (including https://), or choose a file.');
                return;
              }
              if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                setContractUrlError('Contract URL must start with http:// or https://.');
                return;
              }
            }
            setContractUrlError(null);
            void runAction('contract-upload-primary', async () => {
              if (candidate) {
                await postDealContract(detail.deal.id, candidate);
                setContractUrlInput('');
              } else if (contractFile) {
                await uploadDealContractFromFile(detail.deal.id, contractFile);
                setContractFile(null);
                if (contractFilePrimaryRef.current) contractFilePrimaryRef.current.value = '';
              }
              setShowReplaceContract(false);
            });
          }}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-nilink-ink px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {pendingAction === 'contract-upload-primary' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </div>
  );

  // Agreement workspace card — driven by contract status
  const agreementWorkspaceCard = (() => {
    const contractStatus = detail.contract?.status ?? 'not_added';

    if (contractStatus === 'not_added') {
      return (
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <header className="max-w-2xl">
            <h3 className="text-lg font-bold tracking-tight text-nilink-ink">Add contract document</h3>
          </header>
          <div className="mt-4 border-t border-gray-100 pt-4">{contractUploadForm}</div>
        </div>
      );
    }

    if (contractStatus === 'uploaded') {
      return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-nilink-ink">Send contract for signature</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your contract is ready. Send it to the athlete so they can review and sign.
          </p>

          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nilink-accent/10 text-nilink-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-nilink-ink">Contract document</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      Ready
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">Contract uploaded and ready to send</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {detail.contract?.fileUrl && (
                  <a
                    href={detail.contract.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Preview contract
                  </a>
                )}
                <button
                  onClick={() => setShowReplaceContract(true)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Replace contract
                </button>
              </div>
            </div>
          </div>

          {showReplaceContract && <div className="mt-4 border-t border-gray-100 pt-4">{contractUploadForm}</div>}

          <div className="mt-5">
            <button
              type="button"
              disabled={
                pendingAction === 'contract-send' ||
                (!contractUrlInput.trim() && !contractFile && !detail.contract?.fileUrl?.trim())
              }
              onClick={() => {
                const candidate = contractUrlInput.trim();

                if (candidate) {
                  let parsed: URL;
                  try {
                    parsed = new URL(candidate);
                  } catch {
                    setContractUrlError('Enter a full URL (including https://), or upload a file.');
                    return;
                  }
                  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                    setContractUrlError('Contract URL must start with http:// or https://.');
                    return;
                  }
                }

                if (!candidate && !contractFile && !detail.contract?.fileUrl?.trim()) {
                  setContractUrlError('Add a valid contract URL or upload a file before sending.');
                  return;
                }
                if (candidate && contractFile) {
                  setContractUrlError('Use either a URL or a file — not both at once.');
                  return;
                }

                setContractUrlError(null);
                void runAction('contract-send', async () => {
                  if (candidate) {
                    await postDealContract(detail.deal.id, candidate);
                    setContractUrlInput('');
                  } else if (contractFile) {
                    await uploadDealContractFromFile(detail.deal.id, contractFile);
                    setContractFile(null);
                    if (contractFilePrimaryRef.current) contractFilePrimaryRef.current.value = '';
                  }
                  await patchContractStatus(detail.contract!.id, 'sent_for_signature');
                });
              }}
              className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-nilink-ink px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {pendingAction === 'contract-send' ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 shrink-0" aria-hidden />
                  Send for signature
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    if (contractStatus === 'sent_for_signature') {
      return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-nilink-ink">Signature request sent</h3>
          <p className="mt-1 text-sm text-gray-500">
            The contract has been sent. Waiting for the athlete to review and sign.
          </p>
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nilink-accent/10 text-nilink-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-nilink-ink">Contract document</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      Sent
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">Signature request sent to athlete</p>
                </div>
              </div>
              {detail.contract?.fileUrl && (
                <a
                  href={detail.contract.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  View contract
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    // contractStatus === 'signed'
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold text-emerald-900">Agreement complete</h3>
        </div>
        <p className="mt-1 text-sm text-emerald-700">
          The agreement is signed. This deal is ready to move into Work in Progress.
        </p>
        {stageProjection?.primaryAction?.key === 'activate_deal' && (
          <button
            type="button"
            disabled={pendingAction === 'deal-active'}
            onClick={() =>
              void runAction('deal-active', async () => {
                await patchDealStatus(detail.deal.id, 'active');
              })
            }
            className="mt-4 cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Finalize And Start Deal
          </button>
        )}
      </div>
    );
  })();

  // Non-agreement workspace tasks content
  const tasksContent = (
    <>
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
            <div className="mt-3">
              <button
                type="button"
                disabled={pendingAction === 'payment-paid'}
                onClick={() => setShowPayModal(true)}
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
            <p className="mt-1 text-xs text-red-700">
              The athlete has requested to cancel this deal. Accept to close it or dispute to escalate.
            </p>
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
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col bg-nilink-page">
      <div className="dash-main-gutter-x flex flex-1 flex-col pb-24 pt-8 sm:pb-28">

        {/* 1. BACK LINK + DEAL HEADER */}
        <div className="mb-6">
          <Link
            href="/dashboard/deals"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to deals
          </Link>
        </div>

        <div className="mb-4">
          <h1 className="text-3xl font-black tracking-tight text-nilink-ink">
            {detail.deal.brandName?.toUpperCase()}
            <span className="text-nilink-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {detail.deal.campaignName}
            {compensation && ` · $${compensation}`}
            {detail.deliverables.length > 0 &&
              ` · ${detail.deliverables.length} deliverable${detail.deliverables.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Inline error */}
        {actionError ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {actionError}
          </div>
        ) : null}

        {/* 2. STATUS + PROGRESS CARD */}
        {stageProjection ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-nilink-sidebar via-[#2a2a2d] to-nilink-sidebar shadow-xl shadow-black/25 ring-1 ring-inset ring-white/[0.07]"
          >
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
                {detail.deal.status === 'cancelled' ? (
                  <p className="text-lg font-bold tracking-tight text-white">Deal cancelled</p>
                ) : null}
                {detail.deal.status !== 'cancelled' ? (
                  <span className={`shrink-0 ${turn.className}`}>{turn.label}</span>
                ) : null}
              </div>

              {/* Progress stepper */}
              <div className="mt-8 sm:mt-9">
                <ProgressTracker stageId={stageProjection.stageId} cancelled={detail.deal.status === 'cancelled'} />
              </div>

              {/* Metadata row — separator line + two columns */}
              <div className="mt-8 flex flex-col gap-5 border-t border-white/[0.12] pt-7 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:pt-8">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug text-white/55">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-nilink-accent ring-2 ring-nilink-accent/25" />
                  <span className="font-medium text-white/70">Current status</span>
                  <span className="text-white/90">
                    {detail.deal.status === 'cancelled' ? 'Deal cancelled' : stageProjection.statusLine}
                  </span>
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
          </motion.div>
        ) : null}

        {/* 3. CURRENT-STEP WORKSPACE CARD */}
        {stageProjection?.stageId === 'agreement' ? (
          agreementWorkspaceCard
        ) : detail.deal.status === 'closed' ? (
          /* === CLOSED STATE === */
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
        ) : detail.deal.status === 'cancelled' ? (
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
          /* === STAGE-SPECIFIC WORKSPACE === */
          <div className="space-y-4">
            {stageProjection?.stageId === 'work_in_progress' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-nilink-ink">Awaiting deliverables</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The athlete is working on the deliverables. You&apos;ll be notified when they submit.
                </p>
                {detail.deliverables.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {detail.deliverables.map((del) => {
                      const subs = submissionsByDeliverable[del.id] ?? [];
                      const latest = subs.reduce<ApiSubmission | null>(
                        (acc, s) => (!acc || s.version > acc.version ? s : acc),
                        null
                      );
                      return (
                        <div key={del.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-nilink-ink">{del.title}</p>
                            {del.dueAt && (
                              <p className="mt-0.5 text-xs text-gray-500">
                                Due {new Date(del.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                            {latest ? latest.status.replace(/_/g, ' ') : 'Not submitted'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {detail.deal.status === 'cancellation_requested' && (
                  <div className="mt-5">
                    {cancellationRequester === 'brand' ? (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                        <p className="text-xs font-medium text-yellow-800">Cancellation Requested</p>
                        <p className="mt-1 text-xs text-yellow-700">Awaiting the athlete&apos;s response.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-800">Cancellation Requested</p>
                        <p className="mt-1 text-xs text-red-700">
                          The athlete has requested to cancel this deal. Accept to close it or dispute to escalate.
                        </p>
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
                    )}
                  </div>
                )}
              </div>
            ) : stageProjection?.stageId === 'review_revisions' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-nilink-ink">Review submission</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Review the athlete&apos;s work and approve or request changes.
                </p>
                <div className="mt-5">
                  {primaryReviewTarget ? (
                    <>
                      <p className="text-sm font-semibold text-nilink-ink">
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
                    <p className="text-sm text-gray-500">No submissions pending review right now.</p>
                  )}
                </div>
                {detail.deliverables.length > 0 && (
                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">All deliverables</p>
                    <div className="space-y-3">
                      {detail.deliverables.map((del) => {
                        const subs = submissionsByDeliverable[del.id] ?? [];
                        const latest = subs.reduce<ApiSubmission | null>(
                          (acc, s) => (!acc || s.version > acc.version ? s : acc),
                          null
                        );
                        return (
                          <div key={del.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                            <p className="text-sm font-semibold text-nilink-ink">{del.title}</p>
                            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                              {latest ? latest.status.replace(/_/g, ' ') : 'Not submitted'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : stageProjection?.stageId === 'completed' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-nilink-ink">Ready for payout</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All deliverables have been approved. Initiate the payout to complete the deal.
                </p>
                <div className="mt-5">
                  {stageProjection.primaryAction?.key === 'move_to_payment' ? (
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
                      className="cursor-pointer rounded-lg bg-nilink-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-nilink-accent-hover disabled:opacity-50"
                    >
                      Move To Payout
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {stageProjection.primaryAction?.reason ?? 'Waiting for deliverables to be approved.'}
                    </p>
                  )}
                </div>
              </div>
            ) : stageProjection?.stageId === 'payment' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-nilink-ink">Send payout</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Mark the payment as sent to complete the deal.
                </p>
                {detail.payment && (
                  <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-sm font-semibold text-nilink-ink">
                      {detail.payment.currency} {detail.payment.amount.toLocaleString()} ·{' '}
                      {detail.payment.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {stageProjection.primaryAction?.key === 'mark_payment_paid' && detail.payment ? (
                    <button
                      type="button"
                      disabled={pendingAction === 'payment-paid'}
                      onClick={() => setShowPayModal(true)}
                      className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Mark As Paid
                    </button>
                  ) : null}
                  {stageProjection.primaryAction?.key === 'close_deal' ? (
                    <button
                      type="button"
                      disabled={pendingAction === 'deal-close'}
                      onClick={() =>
                        void runAction('deal-close', async () => {
                          await patchDealStatus(detail.deal.id, 'closed');
                        })
                      }
                      className="cursor-pointer rounded-lg bg-nilink-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      Close Deal
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              /* Fallback */
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-nilink-ink">{stageProjection?.stageLabel}</h3>
                <p className="mt-1 text-sm text-gray-500">{stageProjection?.stageDescription}</p>
                <div className="mt-5">{tasksContent}</div>
              </div>
            )}
          </div>
        )}

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
          {!['closed', 'cancelled'].includes(detail.deal.status) && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="rounded-md border-2 border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 opacity-65 shadow-md ring-1 ring-black/5 transition-all hover:opacity-100 hover:border-red-300 hover:text-red-600 hover:shadow-lg"
            >
              Cancel this deal
            </button>
          )}
        </div>
      </div>

      {/* Payment confirmation modal */}
      {showPayModal && detail.payment ? (() => {
        const handleConfirmPayment = () => {
          void runAction('payment-paid', async () => {
            await patchPaymentStatus((detail.payment as ApiPayment).id, 'paid', {
              provider: 'manual',
              providerReference: paymentReference.trim(),
            });
            setPaymentReference('');
          });
          setShowPayModal(false);
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-modal-title"
          >
            <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
              <h2 id="pay-modal-title" className="text-base font-bold text-nilink-ink">
                Confirm Payment
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                This action is irreversible. Confirm that the payment has been sent to the athlete.
              </p>
              <div className="mt-4">
                <label htmlFor="pay-modal-reference" className="mb-1 block text-xs font-semibold text-gray-500">
                  Payout reference or note
                </label>
                <input
                  id="pay-modal-reference"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
                  placeholder="Payout reference or note"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pendingAction === 'payment-paid'}
                  onClick={handleConfirmPayment}
                  className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        );
      })() : null}
    </div>
  );
}
