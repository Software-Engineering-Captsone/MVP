'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  CheckSquare,
  Clock,
  DollarSign,
  Ellipsis,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Lock,
  Loader2,
  Mic,
  Package,
  Pencil,
  Send,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  activitySummary,
  fetchDealDetail,
  fetchSubmissionsForDeliverable,
  formatIsoDate,
  formatIsoDateOnly,
  patchContractStatus,
  patchDealStatus,
  patchPaymentStatus,
  patchSubmission,
  postDealContract,
  requestDealCancellation,
  respondToDealCancellation,
  uploadDealContractFromFile,
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
import { labelForDeliverableType } from '@/lib/campaigns/deals/deliverableTypeLabel';
import { getDisplayInstructions, submissionConfigForDeliverable } from '@/lib/deals/deliverableSubmissionConfig';
import type { ReactNode } from 'react';

function brandReviewSubmissionFields(sub: ApiSubmission): {
  summary: string | null;
  evidenceUrl: string | null;
  evidenceLabel: string | null;
} {
  const textArtifact = sub.artifacts.find((a) => a.kind === 'text' && a.text?.trim());
  const urlArtifact = sub.artifacts.find((a) => a.kind === 'url' && a.ref?.trim());
  return {
    summary: textArtifact?.text?.trim() ?? null,
    evidenceUrl: urlArtifact?.ref?.trim() ?? null,
    evidenceLabel: urlArtifact?.label?.trim() ?? null,
  };
}

function getDeliverableTypeMetaForReview(type: string): { icon: ReactNode; label: string } {
  const label = labelForDeliverableType(type);
  switch (type) {
    case 'tiktok_video':
      return { icon: <Video className="h-4 w-4" />, label };
    case 'appearance_event':
      return { icon: <Calendar className="h-4 w-4" />, label };
    case 'meetup':
      return { icon: <Users className="h-4 w-4" />, label };
    case 'keynote':
      return { icon: <Mic className="h-4 w-4" />, label };
    case 'custom':
      return { icon: <Package className="h-4 w-4" />, label };
    default:
      return { icon: <ImageIcon className="h-4 w-4" />, label };
  }
}

function getDeliverableTypeAccentForReview(type: string): { chip: string; iconWrap: string; strip: string } {
  switch (type) {
    case 'tiktok_video':
      return {
        chip: 'border-pink-200 bg-pink-50 text-pink-700',
        iconWrap: 'bg-pink-100 text-pink-700',
        strip: 'from-pink-400/40 to-fuchsia-400/40',
      };
    case 'appearance_event':
    case 'meetup':
    case 'keynote':
      return {
        chip: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        iconWrap: 'bg-indigo-100 text-indigo-700',
        strip: 'from-indigo-400/40 to-blue-400/40',
      };
    case 'story':
      return {
        chip: 'border-purple-200 bg-purple-50 text-purple-700',
        iconWrap: 'bg-purple-100 text-purple-700',
        strip: 'from-purple-400/40 to-violet-400/40',
      };
    case 'instagram_post':
      return {
        chip: 'border-amber-200 bg-amber-50 text-amber-700',
        iconWrap: 'bg-amber-100 text-amber-700',
        strip: 'from-amber-400/40 to-orange-400/40',
      };
    default:
      return {
        chip: 'border-slate-200 bg-slate-50 text-slate-700',
        iconWrap: 'bg-slate-100 text-slate-700',
        strip: 'from-slate-300/40 to-slate-400/40',
      };
  }
}

/** Matches athlete deliverable chip palette; `isSelected` tints the filled state. */
function getBrandDeliverableChipStyle(status: string, isSelected: boolean, type: string): string {
  if (['approved', 'published', 'completed'].includes(status)) {
    return isSelected
      ? 'border-green-500 bg-green-500 text-white'
      : 'border-green-200 bg-green-50 text-green-700';
  }
  if (['draft_submitted', 'under_review'].includes(status)) {
    return isSelected
      ? 'border-yellow-500 bg-yellow-500 text-white'
      : 'border-yellow-200 bg-yellow-50 text-yellow-700';
  }
  if (status === 'revision_requested') {
    return isSelected
      ? 'border-amber-500 bg-amber-500 text-white'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }
  const typeAccent = getDeliverableTypeAccentForReview(type);
  return isSelected ? typeAccent.chip : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400';
}

function getDeliverableTypeCtaAccent(type: string): string {
  switch (type) {
    case 'tiktok_video':
      return 'bg-pink-600 hover:bg-pink-500 shadow-[0_8px_20px_rgba(219,39,119,0.28)]';
    case 'appearance_event':
    case 'meetup':
    case 'keynote':
      return 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_8px_20px_rgba(79,70,229,0.28)]';
    case 'story':
      return 'bg-violet-600 hover:bg-violet-500 shadow-[0_8px_20px_rgba(124,58,237,0.28)]';
    case 'instagram_post':
      return 'bg-amber-600 hover:bg-amber-500 shadow-[0_8px_20px_rgba(217,119,6,0.28)]';
    default:
      return 'bg-nilink-accent hover:bg-nilink-accent-hover shadow-[0_8px_20px_rgba(14,165,233,0.2)]';
  }
}

/** Same layout and tokens as `AthleteDealWorkspace` progress stepper. */
function ProgressTracker({ stageId, cancelled }: { stageId: DealStageId; cancelled?: boolean }) {
  const currentIndex = STAGE_ORDER.indexOf(stageId);
  return (
    <div className="flex items-start justify-between gap-2 sm:gap-3">
      {STAGE_ORDER.map((step, i) => {
        const isDone = !cancelled && i < currentIndex;
        const isCurrent = !cancelled && i === currentIndex;
        return (
          <div key={step} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-8 w-full items-center">
              <div className={`h-px flex-1 ${i === 0 ? 'invisible' : isDone || isCurrent ? 'bg-sky-300' : 'bg-slate-200'}`} />
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  cancelled
                    ? 'border-slate-200 bg-slate-100 text-slate-400'
                    : isCurrent
                      ? 'border-nilink-accent bg-nilink-accent text-white shadow-[0_4px_10px_rgba(14,165,233,0.2)]'
                      : isDone
                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-400'
                } ${cancelled ? '' : isCurrent ? 'ring-2 ring-nilink-accent/20' : ''}`}
              >
                {cancelled ? '×' : isDone ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className={`h-px flex-1 ${i === STAGE_ORDER.length - 1 ? 'invisible' : isDone ? 'bg-sky-300' : 'bg-slate-200'}`} />
            </div>
            <span
              className={`text-center text-[11px] leading-tight ${
                cancelled ? 'text-slate-400' : isCurrent ? 'font-semibold text-slate-900' : isDone ? 'text-slate-600' : 'text-slate-400'
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
  /** When set, revision note + Send UI is open for that submission (Approve is one-click). */
  const [brandRevisionOpenSubmissionId, setBrandRevisionOpenSubmissionId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFooterMenu, setShowFooterMenu] = useState(false);
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

  useEffect(() => {
    setShowFooterMenu(false);
  }, [dealId]);

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

  /** Deliverables whose latest submission needs brand review (aligns with brand deliverable projection). */
  const brandAttentionDeliverableCount = useMemo(() => {
    if (!detail) return 0;
    let n = 0;
    for (const d of detail.deliverables) {
      const subs = submissionsByDeliverable[d.id] ?? [];
      const latest = subs.reduce<ApiSubmission | null>((acc, s) => (!acc || s.version > acc.version ? s : acc), null);
      if (latest && (latest.status === 'submitted' || latest.status === 'viewed')) n += 1;
    }
    return n;
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

  const agreementStageIndex = STAGE_ORDER.indexOf('agreement');
  const currentStageIndexForFooter = stageProjection ? STAGE_ORDER.indexOf(stageProjection.stageId) : -1;
  const canViewContractFooter = Boolean(
    detail?.contract?.fileUrl?.trim() &&
      agreementStageIndex >= 0 &&
      currentStageIndexForFooter >= agreementStageIndex,
  );
  const canShowCancelFooter = Boolean(detail && !['closed', 'cancelled'].includes(detail.deal.status));

  const canStickyBrandDeliverablesProgress = Boolean(
    stageProjection &&
      (stageProjection.stageId === 'work_in_progress' || stageProjection.stageId === 'review_revisions'),
  );

  const cancellationRequester = useMemo(() => {
    if (!detail || detail.deal.status !== 'cancellation_requested') return null;
    const act = [...(detail.activities ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((a) => a.eventType === 'cancellation_requested');
    return (act?.metadata?.requestedByRole as string | undefined) ?? (act?.actorType ?? null);
  }, [detail]);

  const primaryReviewTarget = pendingReviews[0] ?? null;

  const pendingReviewByDeliverableId = useMemo(() => {
    const m = new Map<string, { submission: ApiSubmission; deliverable: ApiDeliverable }>();
    for (const row of pendingReviews) {
      m.set(row.deliverable.id, row);
    }
    return m;
  }, [pendingReviews]);

  const [selectedReviewDeliverableId, setSelectedReviewDeliverableId] = useState<string | null>(null);

  const firstPendingDeliverableId = pendingReviews[0]?.deliverable.id ?? null;

  useEffect(() => {
    if (!detail?.deliverables.length) return;
    const valid = new Set(detail.deliverables.map((d) => d.id));
    const preferred = firstPendingDeliverableId ?? detail.deliverables[0]?.id ?? null;
    setSelectedReviewDeliverableId((prev) => {
      if (prev && valid.has(prev)) return prev;
      return preferred;
    });
  }, [detail?.deal.id, detail?.deliverables, firstPendingDeliverableId]);

  useEffect(() => {
    setBrandRevisionOpenSubmissionId(null);
  }, [selectedReviewDeliverableId]);

  const selectedReviewTarget = useMemo(() => {
    if (!selectedReviewDeliverableId) return null;
    return pendingReviewByDeliverableId.get(selectedReviewDeliverableId) ?? null;
  }, [pendingReviewByDeliverableId, selectedReviewDeliverableId]);

  const runAction = async (key: string, fn: () => Promise<void>): Promise<boolean> => {
    setPendingAction(key);
    setActionError(null);
    try {
      await fn();
      await loadDetail(dealId);
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  const renderReviewDeliverableChipRow = () => {
    if (!detail || detail.deliverables.length === 0) return null;
    return (
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Deliverables">
        {detail.deliverables.map((del, idx) => {
          const isSelected = selectedReviewDeliverableId === del.id;
          const needsBrandAction = pendingReviewByDeliverableId.has(del.id);
          const chipStyle = getBrandDeliverableChipStyle(del.status, isSelected, del.type);
          const attentionClass =
            needsBrandAction && !isSelected ? ' brand-chip-needs-action' : '';
          return (
            <button
              key={del.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={
                needsBrandAction
                  ? `Deliverable ${idx + 1}, needs your review`
                  : `Deliverable ${idx + 1}`
              }
              onClick={() => setSelectedReviewDeliverableId(del.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-180 ${chipStyle}${attentionClass}`}
            >
              {['approved', 'published', 'completed'].includes(del.status) ? (
                <CheckCircle className="h-3 w-3 shrink-0" aria-hidden />
              ) : null}
              <span>Deliverable {idx + 1}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderPrimaryReviewPanel = (target: { submission: ApiSubmission; deliverable: ApiDeliverable }) => {
    const { submission, deliverable } = target;
    const fields = brandReviewSubmissionFields(submission);
    const typeAccent = getDeliverableTypeAccentForReview(deliverable.type);
    const typeMeta = getDeliverableTypeMetaForReview(deliverable.type);
    const ctaAccent = getDeliverableTypeCtaAccent(deliverable.type);
    const submissionConfig = submissionConfigForDeliverable(deliverable);
    const displayInstructions = getDisplayInstructions(deliverable.instructions);
    const feedbackId = `revision-feedback-${submission.id}`;
    const fieldLabelClass = 'text-[13px] font-semibold text-nilink-ink';
    const fieldReadOnlyClass =
      'mt-3 w-full rounded-xl border border-gray-100 bg-gray-50/90 px-3.5 py-2.5 text-sm text-nilink-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)]';
    const fieldBaseClass =
      'mt-3 w-full rounded-xl border border-gray-100 bg-white px-3.5 py-2.5 text-sm text-nilink-ink placeholder:text-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors duration-200 focus-nilink focus:border-nilink-accent/40 focus:outline-none';
    const checklistRowClass = 'flex min-h-12 items-start gap-2.5 py-2.5';
    const readinessRowClass = 'flex min-h-11 items-center gap-3 py-2';
    const hasNotes = Boolean(submission.notes?.trim());

    const briefCardBody = (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText className="h-4 w-4" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-nilink-ink">Deliverable brief</p>
        </div>
        <section className="border-t border-gray-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Brief notes</p>
          {displayInstructions ? (
            <p className="mt-2 text-xs leading-relaxed text-gray-600">{displayInstructions}</p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-gray-400">No additional brief notes on this deliverable.</p>
          )}
        </section>
        {submissionConfig.briefItems.length > 0 ? (
          <section className="border-t border-gray-100 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Required checks</p>
            <ul className="mt-2 divide-y divide-gray-100">
              {submissionConfig.briefItems.map((item) => (
                <li key={item.label} className={checklistRowClass}>
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 ring-1 ring-gray-200">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800">{item.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">From the agreed deliverable scope.</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="border-t border-gray-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Submission received</p>
          <ul className="mt-2 divide-y divide-gray-100">
            <li className={readinessRowClass}>
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                  fields.evidenceUrl ? 'bg-emerald-50/60 text-emerald-500 ring-emerald-100' : 'bg-rose-50/60 text-rose-300 ring-rose-100'
                }`}
              >
                {fields.evidenceUrl ? (
                  <CheckCircle className="h-3 w-3 text-emerald-500" aria-hidden />
                ) : (
                  <X className="h-3 w-3 text-rose-300" aria-hidden />
                )}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-medium text-slate-800">Evidence link</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {fields.evidenceUrl ? 'Athlete included a link to review.' : 'No link on file — use summary/notes or request a revision.'}
                </p>
              </div>
            </li>
            <li className={readinessRowClass}>
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                  fields.summary ? 'bg-emerald-50/60 text-emerald-500 ring-emerald-100' : 'bg-rose-50/60 text-rose-300 ring-rose-100'
                }`}
              >
                {fields.summary ? (
                  <CheckCircle className="h-3 w-3 text-emerald-500" aria-hidden />
                ) : (
                  <X className="h-3 w-3 text-rose-300" aria-hidden />
                )}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-medium text-slate-800">{submissionConfig.descriptionLabel}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {fields.summary ? 'Athlete summary is present.' : 'No structured summary text on this version.'}
                </p>
              </div>
            </li>
            <li className={readinessRowClass}>
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                  hasNotes ? 'bg-emerald-50/60 text-emerald-500 ring-emerald-100' : 'bg-slate-50/80 text-slate-300 ring-slate-100'
                }`}
              >
                {hasNotes ? (
                  <CheckCircle className="h-3 w-3 text-emerald-500" aria-hidden />
                ) : (
                  <span className="text-[9px] font-bold text-slate-300" aria-hidden>
                    —
                  </span>
                )}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-medium text-slate-800">Note to brand</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {hasNotes ? 'Athlete left additional context.' : 'Optional — not required for every submission.'}
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    );

    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className={`h-1 w-full bg-gradient-to-r ${typeAccent.strip}`} aria-hidden />
        <div className="flex items-start gap-3 border-b border-gray-100 p-6 pb-5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${typeAccent.iconWrap} shadow-[0_2px_8px_rgba(15,23,42,0.06)]`}
            aria-hidden
          >
            {typeMeta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold leading-tight tracking-tight text-nilink-ink sm:text-[1.125rem]">
              {deliverable.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-600">{typeMeta.label}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              <span className="text-slate-400">Submitted</span>{' '}
              <span className="font-medium text-slate-800">{formatIsoDate(submission.submittedAt)}</span>
              <span className="text-slate-300" aria-hidden>
                {' '}
                ·{' '}
              </span>
              <span className="text-slate-400">Version</span>{' '}
              <span className="font-medium text-slate-800">{submission.version}</span>
              <span className="text-slate-300" aria-hidden>
                {' '}
                ·{' '}
              </span>
              <span className="text-slate-400">Revisions</span>{' '}
              <span className="font-medium text-slate-800">
                {deliverable.revisionCountUsed}/{deliverable.revisionLimit}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Your turn
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
            <div className="flex h-full min-h-0 flex-col gap-5">
              <section
                aria-labelledby={`athlete-submission-${submission.id}`}
                className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] sm:p-6"
              >
                <div className="mb-5 flex flex-wrap items-start gap-3 border-b border-slate-200/80 pb-4">
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200/80">
                    <Users className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h4 id={`athlete-submission-${submission.id}`} className="text-sm font-semibold text-nilink-ink">
                      Athlete submission
                    </h4>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                      Evidence, summary, and notes from the athlete.
                    </p>
                  </div>
                </div>
                <div className="space-y-7">
                  {fields.evidenceUrl ? (
                    <div>
                      <p className={fieldLabelClass}>View deliverable</p>
                      <a
                        href={fields.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-[transform,filter,box-shadow] duration-180 motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:brightness-105 motion-reduce:hover:translate-y-0 ${ctaAccent}`}
                      >
                        <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                        Open evidence
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      <div>
                        <p className="font-semibold">No evidence link on this submission</p>
                        <p className="mt-0.5 leading-relaxed text-amber-800/90">
                          Review the summary and notes below. Request a revision if you need a public or shared link to verify the work.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className={fieldLabelClass}>{submissionConfig.descriptionLabel}</p>
                    {fields.summary ? (
                      <p className={`${fieldReadOnlyClass} whitespace-pre-wrap leading-relaxed`}>{fields.summary}</p>
                    ) : (
                      <p className={`${fieldReadOnlyClass} text-gray-400`}>—</p>
                    )}
                  </div>

                  <div>
                    <p className={fieldLabelClass}>Note to brand</p>
                    {hasNotes ? (
                      <p className={`${fieldReadOnlyClass} whitespace-pre-wrap leading-relaxed text-gray-600`}>{submission.notes!.trim()}</p>
                    ) : (
                      <p className={`${fieldReadOnlyClass} text-gray-400`}>—</p>
                    )}
                  </div>
                </div>
              </section>

              <div
                className="mt-auto rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-nilink-accent/15 sm:p-6"
                aria-labelledby={`brand-review-${submission.id}`}
              >
                  <div className="mb-4 min-w-0">
                    <h4 id={`brand-review-${submission.id}`} className="text-[13px] font-semibold text-nilink-ink">
                      {brandRevisionOpenSubmissionId === submission.id ? 'Request changes' : 'Accept or request changes'}
                    </h4>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                      {brandRevisionOpenSubmissionId === submission.id
                        ? "Give them enough to go on; they'll see this when they resubmit."
                        : 'Approve in one tap, or open Revise to explain what should change.'}
                    </p>
                  </div>

                  {brandRevisionOpenSubmissionId === submission.id ? (
                    <>
                      <label htmlFor={feedbackId} className={fieldLabelClass}>
                        Revision note
                      </label>
                      <textarea
                        id={feedbackId}
                        className={`${fieldBaseClass} min-h-[6.5rem] w-full resize-y sm:min-h-[7.5rem]`}
                        rows={4}
                        placeholder=""
                        value={revisionFeedback[submission.id] ?? ''}
                        onChange={(e) => setRevisionFeedback((prev) => ({ ...prev, [submission.id]: e.target.value }))}
                      />
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          disabled={pendingAction === `rv-${submission.id}`}
                          onClick={() => setBrandRevisionOpenSubmissionId(null)}
                          className="cursor-pointer text-left text-[12px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:opacity-50"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={pendingAction === `rv-${submission.id}`}
                          onClick={() => {
                            void (async () => {
                              const ok = await runAction(`rv-${submission.id}`, async () => {
                                const fb = revisionFeedback[submission.id]?.trim();
                                await patchSubmission(submission.id, {
                                  status: 'revision_requested',
                                  ...(fb ? { feedback: fb } : {}),
                                });
                              });
                              if (ok) setBrandRevisionOpenSubmissionId(null);
                            })();
                          }}
                          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-300/90 bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(217,119,6,0.2)] transition-[transform,background-color,filter] duration-180 motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:bg-amber-600 motion-reduce:hover:translate-y-0 disabled:translate-y-0 disabled:opacity-50 sm:ml-auto sm:w-auto sm:min-w-[8.5rem]"
                        >
                          {pendingAction === `rv-${submission.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Send className="h-4 w-4" aria-hidden />
                          )}
                          Send
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={pendingAction === `ap-${submission.id}` || pendingAction === `rv-${submission.id}`}
                        onClick={() => {
                          void runAction(`ap-${submission.id}`, async () => {
                            await patchSubmission(submission.id, { status: 'approved' });
                          });
                        }}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(5,150,105,0.25)] transition-[transform,filter,box-shadow] duration-180 motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:bg-emerald-700 motion-reduce:hover:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
                      >
                        {pendingAction === `ap-${submission.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle className="h-4 w-4" aria-hidden />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pendingAction === `ap-${submission.id}` || pendingAction === `rv-${submission.id}`}
                        onClick={() => setBrandRevisionOpenSubmissionId(submission.id)}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-200/90 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 transition-[transform,background-color] duration-180 motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:bg-amber-100/90 motion-reduce:hover:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
                      >
                        <AlertCircle className="h-4 w-4" aria-hidden />
                        Revise
                      </button>
                    </div>
                  )}
              </div>
            </div>

            <aside className="flex h-full min-h-0 flex-col lg:min-h-0">
              <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] sm:p-6">
                {briefCardBody}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
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
    ? `${activitySummary(latestActivity)} · ${formatIsoDateOnly(latestActivity.createdAt)}`
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
          The agreement is signed. This deal is ready to move into Deliverables.
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
          {renderReviewDeliverableChipRow()}
          <div className="mt-4">
            {selectedReviewTarget ? (
              renderPrimaryReviewPanel(selectedReviewTarget)
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-600">No submission awaiting review for this deliverable.</p>
                <p className="mt-1 text-xs text-slate-500">Choose another deliverable from the row above.</p>
              </div>
            )}
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
      <div className="dash-main-gutter-x flex flex-1 flex-col pb-2 pt-8 sm:pb-3 sm:pt-10">

        {/* 1. BACK LINK + DEAL HEADER (spacing matches athlete deal page) */}
        <div className="mb-7">
          <Link
            href="/dashboard/deals"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to deals
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-nilink-ink sm:text-[2.1rem]">
            {(detail.deal.athleteName?.trim() || 'Athlete').toUpperCase()}
            <span className="text-nilink-accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
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

        {/* 2. STATUS + PROGRESS CARD (matches AthleteDealWorkspace) */}
        {stageProjection ? (
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="relative px-6 py-6 sm:px-8 sm:py-7">
              {detailLoading ? (
                <div
                  className="pointer-events-none absolute right-6 top-6 z-10 flex h-6 items-center sm:right-8 sm:top-6"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden />
                  <span className="sr-only">Refreshing</span>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-start gap-3">
                {detail.deal.status === 'cancelled' ? (
                  <p className="text-lg font-semibold tracking-tight text-slate-900">Deal cancelled</p>
                ) : null}
                {detail.deal.status !== 'cancelled' ? (
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                      brandAttentionDeliverableCount > 0
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {brandAttentionDeliverableCount > 0
                      ? `Action needed (${brandAttentionDeliverableCount})`
                      : 'All caught up'}
                  </span>
                ) : null}
              </div>

              <div className="mt-6">
                <ProgressTracker stageId={stageProjection.stageId} cancelled={detail.deal.status === 'cancelled'} />
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug text-slate-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-nilink-accent" />
                  <span className="font-medium text-slate-600">Current status</span>
                  <span className="text-slate-800">
                    {detail.deal.status === 'cancelled' ? 'Deal cancelled' : stageProjection.statusLine}
                  </span>
                </div>
                {latestActivity && latestActivityLabel && (
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug text-slate-500 sm:justify-end">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span className="font-medium text-slate-600">Latest activity</span>
                    <span className="text-slate-800">{latestActivityLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
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
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.05)] sm:p-8">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <h3 className="text-base font-bold text-nilink-ink">Review submission</h3>
                    <p className="mt-1.5 max-w-2xl text-sm text-gray-500">
                      Review the athlete&apos;s work, then approve or request a revision with clear feedback.
                    </p>
                  </div>
                </div>
                {renderReviewDeliverableChipRow()}
                <div className="mt-6">
                  {selectedReviewTarget ? (
                    renderPrimaryReviewPanel(selectedReviewTarget)
                  ) : pendingReviews.length === 0 ? (
                    detail?.deliverables.some((d) => d.status === 'approved' && d.publishRequired) ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-10 text-center">
                        <p className="text-sm font-medium text-emerald-800">All submissions approved — awaiting publication.</p>
                        <p className="mt-1 text-xs text-emerald-700">The athlete will mark deliverables as published once they&apos;re live.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                        <p className="text-sm font-medium text-slate-600">No submissions pending review right now.</p>
                        <p className="mt-1 text-xs text-slate-500">When an athlete submits new work, it will appear here.</p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                      <p className="text-sm font-medium text-slate-600">No submission awaiting review for this deliverable.</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Select a deliverable with a pulsing highlight if you need to approve or request changes.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : stageProjection?.stageId === 'completed' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-nilink-ink">Ready for payout</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All deliverables have been delivered. Review the published content below, then initiate payout.
                </p>
                {detail.deliverables.some((d) => d.publishRequired) ? (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                    <p className="text-sm font-semibold text-slate-800">Published content</p>
                    <p className="mt-0.5 text-xs text-slate-500">Verify each deliverable is live before releasing payout.</p>
                    <ul className="mt-3 space-y-2">
                      {detail.deliverables
                        .filter((d) => d.publishRequired)
                        .map((d) => {
                          const isPublished = d.status === 'completed' || d.status === 'published';
                          const tone = isPublished
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200';
                          const label = isPublished ? 'Published' : 'Awaiting publication';
                          return (
                            <li key={d.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800">{d.title}</p>
                                <p className="text-xs text-slate-500">{labelForDeliverableType(d.type)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
                                {isPublished && d.publishedUrl ? (
                                  <a
                                    href={d.publishedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                  >
                                    View post
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                  </a>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ) : null}
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
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-nilink-accent px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(14,165,233,0.25)] transition-[transform,filter,box-shadow] duration-180 motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:bg-nilink-accent-hover motion-reduce:hover:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
                    >
                      {pendingAction === 'deal-payment' ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : null}
                      Move to Payout
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

      {(canShowCancelFooter || canViewContractFooter || canStickyBrandDeliverablesProgress) && (
        <div className="pointer-events-none sticky bottom-0 z-20" role="contentinfo" aria-label="Deal shortcuts">
          <div className="pointer-events-auto dash-main-gutter-x pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.1)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="relative">
                  {(canShowCancelFooter || canViewContractFooter) && (
                    <>
                      <button
                        type="button"
                        aria-label="More actions"
                        aria-haspopup="menu"
                        aria-expanded={showFooterMenu}
                        onClick={() => setShowFooterMenu((prev) => !prev)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors duration-180 hover:bg-slate-100 hover:text-slate-500"
                      >
                        <Ellipsis className="h-4 w-4" />
                      </button>
                      {showFooterMenu ? (
                        <div className="absolute bottom-full left-0 mb-2 min-w-[130px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                          {canViewContractFooter ? (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setShowFooterMenu(false);
                                const url = detail.contract?.fileUrl?.trim();
                                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="block w-full rounded-md px-2.5 py-1.5 text-left text-[11px] font-medium leading-4 text-slate-500 transition-colors duration-180 hover:bg-slate-50 hover:text-slate-700"
                            >
                              View contract
                            </button>
                          ) : null}
                          {canShowCancelFooter ? (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setShowFooterMenu(false);
                                setShowCancelModal(true);
                              }}
                              className="block w-full rounded-md px-2.5 py-1.5 text-left text-[11px] font-medium leading-4 text-red-400 transition-colors duration-180 hover:bg-red-50 hover:text-red-500"
                            >
                              Cancel deal
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                  {canStickyBrandDeliverablesProgress ? (
                    <div className="inline-flex max-w-[min(100%,14rem)] items-start gap-1.5 rounded-md border border-slate-200/90 bg-slate-50/90 px-2 py-1.5 text-left text-slate-700 sm:max-w-[16rem]">
                      <Clock className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" aria-hidden />
                      <div className="min-w-0">
                        {detail?.deliverables.every((d) => ['approved', 'published', 'completed'].includes(d.status)) ? (
                          <>
                            <p className="text-[11px] font-semibold leading-tight text-slate-800">Awaiting publication</p>
                            <p className="mt-0.5 text-[10px] leading-tight text-slate-600">Athlete is publishing approved content</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[11px] font-semibold leading-tight text-slate-800">Deliverables in progress</p>
                            <p className="mt-0.5 text-[10px] leading-tight text-slate-600">Every deliverable should be approved</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
