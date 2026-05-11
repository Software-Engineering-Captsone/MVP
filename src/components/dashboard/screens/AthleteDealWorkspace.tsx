'use client';

import React from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Ellipsis,
  ExternalLink,
  X,
  FileText,
  FileX2,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Mic,
  Package,
  Send,
  Users,
  Video,
} from 'lucide-react';
import { labelForDeliverableType } from '@/lib/campaigns/deals/deliverableTypeLabel';
import { isPublishableDeliverableType } from '@/lib/campaigns/deals/types';
import {
  compensationAmountFromDealSnapshot,
  createDeliverableSubmission,
  fetchDealDetail,
  fetchSubmissionsForDeliverable,
  formatIsoDate,
  formatIsoDateOnly,
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
import {
  getDisplayInstructions,
  submissionConfigForDeliverable,
} from '@/lib/deals/deliverableSubmissionConfig';

type SubmitForm = {
  url: string;
  body: string;
  notes: string;
};

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
                } ${
                  cancelled
                    ? ''
                    : isCurrent
                      ? 'ring-2 ring-nilink-accent/20'
                      : ''
                }`}
              >
                {cancelled ? '×' : isDone ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className={`h-px flex-1 ${i === STAGE_ORDER.length - 1 ? 'invisible' : isDone ? 'bg-sky-300' : 'bg-slate-200'}`} />
            </div>
            <span
              className={`text-center text-[11px] leading-tight ${
                cancelled ? 'text-slate-400'
                  : isCurrent
                    ? 'font-semibold text-slate-900'
                    : isDone
                      ? 'text-slate-600'
                      : 'text-slate-400'
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

function getDeliverableTypeMeta(type: string): { icon: React.ReactNode; label: string } {
  const label = labelForDeliverableType(type);
  switch (type) {
    case 'tiktok_video':     return { icon: <Video className="h-4 w-4" />, label };
    case 'appearance_event': return { icon: <Calendar className="h-4 w-4" />, label };
    case 'meetup':           return { icon: <Users className="h-4 w-4" />, label };
    case 'keynote':          return { icon: <Mic className="h-4 w-4" />, label };
    case 'custom':           return { icon: <Package className="h-4 w-4" />, label };
    default:                 return { icon: <ImageIcon className="h-4 w-4" />, label }; // instagram_post, story
  }
}

function getDeliverableTypeAccent(type: string): { chip: string; iconWrap: string; strip: string } {
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

function normalizeSubmitForm(form: Partial<SubmitForm> | undefined, _deliverable: ApiDealDetail['deliverables'][number]): SubmitForm {
  return {
    url: typeof form?.url === 'string' ? form.url : '',
    body: typeof form?.body === 'string' ? form.body : '',
    notes: typeof form?.notes === 'string' ? form.notes : '',
  };
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
  const [submittedKeys, setSubmittedKeys] = useState<Set<string>>(new Set());
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null);
  const [publishUrlByDeliverable, setPublishUrlByDeliverable] = useState<Record<string, string>>({});
  const [publishUrlErrors, setPublishUrlErrors] = useState<Record<string, string | null>>({});
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitFieldRefs = useRef<
    Record<string, { url: HTMLInputElement | null; body: HTMLTextAreaElement | null }>
  >({});

  const saveDraft = (id: string, forms: Record<string, SubmitForm>) => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      localStorage.setItem(`draft_submission_${id}`, JSON.stringify(forms));
    }, 800);
  };

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
        forms[deliverable.id] = normalizeSubmitForm(undefined, deliverable);
      }
      // Merge any saved draft from localStorage so refresh doesn't lose typed content
      const savedDraft = localStorage.getItem(`draft_submission_${d.deal.id}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft) as Record<string, Partial<SubmitForm>>;
          for (const [id, draft] of Object.entries(parsed)) {
            const deliverable = d.deliverables.find((item) => item.id === id);
            if (forms[id] && deliverable) forms[id] = normalizeSubmitForm({ ...forms[id], ...draft }, deliverable);
          }
        } catch {}
      }
      setSubmitForms(forms);
      setSubmitErrors({});
      // Select the highest-priority deliverable by default (first action-needed one)
      setSelectedDeliverableId((prev) => {
        if (prev && d.deliverables.find(del => del.id === prev)) return prev; // keep selection if still valid
        const sorted = [...d.deliverables].sort((a, b) => {
          const p = (s: string) => {
            if (s === 'revision_requested') return 0;
            if (s === 'not_started') return 1;
            if (s === 'draft_submitted') return 2;
            if (s === 'under_review') return 3;
            return 4;
          };
          return p(a.status) - p(b.status);
        });
        return sorted[0]?.id ?? null;
      });
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

  /** Deliverables where the athlete has an enabled primary action (submit, publish, etc.). */
  const athleteAttentionDeliverableCount = useMemo(() => {
    if (!detail) return 0;
    let n = 0;
    for (const d of detail.deliverables) {
      const p = buildDeliverableProjection({
        actor: 'athlete',
        deliverable: d,
        submissionsByDeliverable,
      });
      if (p.primaryAction?.enabled) n += 1;
    }
    return n;
  }, [detail, submissionsByDeliverable]);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showFooterMenu, setShowFooterMenu] = useState(false);

  const cancellationRequester = useMemo(() => {
    if (!detail || detail.deal.status !== 'cancellation_requested') return null;
    const act = [...(detail.activities ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((a) => a.eventType === 'cancellation_requested');
    return (act?.metadata?.requestedByRole as string | undefined) ?? (act?.actorType ?? null);
  }, [detail]);

  const compensationAmount = detail ? compensationAmountFromDealSnapshot(detail.deal.termsSnapshot) : 0;

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

  // Latest activity metadata
  const filteredActivities = filterMainTimelineActivities(detail.activities)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestActivity = filteredActivities[0] ?? null;
  const latestActivityLabel = latestActivity
    ? `${latestActivity.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} · ${formatIsoDateOnly(latestActivity.createdAt)}`
    : null;

  const deal = detail.deal;
  const compensation = compensationAmount > 0 ? compensationAmount.toLocaleString() : null;
  const selectedDeliverable = detail.deliverables.find((d) => d.id === selectedDeliverableId) ?? detail.deliverables[0] ?? null;
  const selectedProjection = selectedDeliverable
    ? buildDeliverableProjection({
        actor: 'athlete',
        deliverable: selectedDeliverable,
        submissionsByDeliverable,
      })
    : null;
  const canStickySubmit = Boolean(selectedDeliverable && selectedProjection?.primaryAction?.key === 'submit_work');
  const canStickyUnderReview = Boolean(
    selectedDeliverable &&
    ['draft_submitted', 'under_review'].includes(selectedDeliverable.status),
  );
  const stickyReadinessChecks = selectedDeliverable
    ? {
        body: Boolean(normalizeSubmitForm(submitForms[selectedDeliverable.id], selectedDeliverable).body.trim()),
        url: Boolean(normalizeSubmitForm(submitForms[selectedDeliverable.id], selectedDeliverable).url.trim()),
      }
    : { body: false, url: false };
  const stickyReadyCount = Number(stickyReadinessChecks.body) + Number(stickyReadinessChecks.url);
  const canShowCancelAction = !['created', 'contract_pending', 'cancelled', 'closed', 'disputed', 'paid', 'cancellation_requested'].includes(deal.status);
  const agreementStageIndex = STAGE_ORDER.indexOf('agreement');
  const currentStageIndex = stageProjection ? STAGE_ORDER.indexOf(stageProjection.stageId) : -1;
  const canViewContractAction = Boolean(
    detail.contract?.fileUrl?.trim() &&
    agreementStageIndex >= 0 &&
    currentStageIndex > agreementStageIndex,
  );
  const stickyCtaAccentClass = selectedDeliverable
    ? getDeliverableTypeCtaAccent(selectedDeliverable.type)
    : 'bg-nilink-accent hover:bg-nilink-accent-hover shadow-[0_8px_20px_rgba(14,165,233,0.2)]';
  const handleSubmitDeliverable = (deliverable: ApiDealDetail['deliverables'][number], mode: 'work_in_progress' | 'standard') => {
    const form = normalizeSubmitForm(submitForms[deliverable.id], deliverable);
    const bodyText = form.body.trim();
    const urlText = form.url.trim();
    if (!bodyText) {
      setSubmitErrors((prev) => ({
        ...prev,
        [deliverable.id]: 'Add a short summary of what you are submitting.',
      }));
      submitFieldRefs.current[deliverable.id]?.body?.focus();
      return;
    }
    setSubmitErrors((prev) => ({ ...prev, [deliverable.id]: null }));
    setPendingKey(`sub-${deliverable.id}`);
    setActionError(null);
    const submissionConfig = submissionConfigForDeliverable(deliverable);
    const request =
      mode === 'work_in_progress'
        ? createDeliverableSubmission(deliverable.id, {
            body: bodyText,
            notes: form.notes,
            submissionType: urlText ? 'mixed' : 'text',
            artifacts: [
              { kind: 'text', text: bodyText, label: submissionConfig.descriptionLabel },
              ...(urlText ? [{ kind: 'url' as const, ref: urlText, label: 'Evidence link' }] : []),
            ],
          })
        : createDeliverableSubmission(deliverable.id, {
            body: bodyText,
            notes: form.notes,
            artifacts: urlText ? [{ kind: 'url', ref: urlText }] : undefined,
          });
    void request
      .then(() => {
        setSubmittedKeys((prev) => new Set(prev).add(deliverable.id));
        const savedRaw = localStorage.getItem(`draft_submission_${detail.deal.id}`);
        if (savedRaw) {
          try {
            const savedParsed = JSON.parse(savedRaw) as Record<string, SubmitForm>;
            delete savedParsed[deliverable.id];
            if (Object.keys(savedParsed).length === 0) {
              localStorage.removeItem(`draft_submission_${detail.deal.id}`);
            } else {
              localStorage.setItem(`draft_submission_${detail.deal.id}`, JSON.stringify(savedParsed));
            }
          } catch {}
        }
        return loadDetail();
      })
      .catch((e) => {
        setActionError(e instanceof Error ? e.message : 'Something went wrong');
      })
      .finally(() => {
        setPendingKey(null);
      });
  };

  const getChipStyle = (status: string, isSelected: boolean, type: string) => {
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
    const typeAccent = getDeliverableTypeAccent(type);
    return isSelected
      ? typeAccent.chip
      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400';
  };

  const renderCancellationBlock = () => {
    if (deal.status !== 'cancellation_requested') return null;
    return (
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
    );
  };

  const renderSubmissionDeliverableCard = (mode: 'work_in_progress' | 'standard') => {
    const deliverable = detail.deliverables.find((d) => d.id === selectedDeliverableId) ?? detail.deliverables[0];
    if (!deliverable) return null;

    const submissions = (submissionsByDeliverable[deliverable.id] ?? []).slice().sort((a, b) => a.version - b.version);
    const showSubmissionSentBanner =
      submittedKeys.has(deliverable.id) ||
      submissions.length > 0 ||
      ['draft_submitted', 'under_review', 'approved', 'published', 'completed'].includes(deliverable.status);
    const form = normalizeSubmitForm(submitForms[deliverable.id], deliverable);
    const projection = buildDeliverableProjection({
      actor: 'athlete',
      deliverable,
      submissionsByDeliverable,
    });
    const typeMeta = getDeliverableTypeMeta(deliverable.type);
    const typeAccent = getDeliverableTypeAccent(deliverable.type);
    const submissionConfig = submissionConfigForDeliverable(deliverable);
    const primaryEvidenceOption = submissionConfig.evidenceOptions[0];
    const supportingEvidenceOptions = submissionConfig.evidenceOptions.slice(1);
    const displayInstructions = getDisplayInstructions(deliverable.instructions);
    const fieldBaseClass =
      'mt-3 w-full rounded-xl border border-gray-100 bg-white px-3.5 py-2.5 text-sm text-nilink-ink placeholder:text-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors duration-200 focus-nilink focus:border-nilink-accent/40 focus:outline-none';
    const fieldLabelClass = 'text-[13px] font-semibold text-nilink-ink';
    const requiredHelperClass = 'mt-1 text-[12px] leading-relaxed text-gray-500';
    const optionalHelperClass = 'mt-1 text-[12px] leading-relaxed text-gray-500';
    const checklistRowClass = 'flex min-h-12 items-start gap-2.5 py-2.5';
    const readinessRowClass = 'flex min-h-11 items-center gap-3 py-2';
    const fieldIds = {
      url: `submission-url-${deliverable.id}`,
      body: `submission-body-${deliverable.id}`,
      notes: `submission-notes-${deliverable.id}`,
      urlHelper: `submission-url-helper-${deliverable.id}`,
      bodyHelper: `submission-body-helper-${deliverable.id}`,
      notesHelper: `submission-notes-helper-${deliverable.id}`,
      bodyError: `submission-body-error-${deliverable.id}`,
    };
    const statusBanner = (() => {
      if (deliverable.status === 'revision_requested') {
        return {
          className: 'border-amber-200 bg-amber-50 text-amber-900',
          icon: <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />,
          title: 'Revision requested',
          copy: 'Update your work using the latest feedback and resubmit when ready.',
        };
      }
      if (['draft_submitted', 'under_review'].includes(deliverable.status)) {
        return {
          className: 'border-blue-200 bg-blue-50 text-blue-900',
          icon: <Clock className="h-4 w-4 shrink-0 text-blue-600" />,
          title: 'Under review',
          copy: 'Your submission is with the brand. Edits are not needed unless revisions are requested.',
        };
      }
      if (['approved', 'published', 'completed'].includes(deliverable.status)) {
        const needsPublish = deliverable.status === 'approved' && deliverable.publishRequired;
        return {
          className: needsPublish
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-emerald-200 bg-emerald-50 text-emerald-900',
          icon: needsPublish
            ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            : <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />,
          title: needsPublish ? 'Approved — publish to complete' : 'Approved',
          copy: needsPublish
            ? 'The brand approved your submission. Publish the content and tap "Mark as Published" below to finalize.'
            : deliverable.status === 'published'
              ? 'Published and accepted. Keep your post live as required.'
              : 'This deliverable is complete and no further updates are needed.',
        };
      }
      return null;
    })();

    const turnChip = (() => {
      if (['not_started', 'revision_requested'].includes(deliverable.status)) {
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Your turn</span>;
      }
      if (['draft_submitted', 'under_review'].includes(deliverable.status)) {
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Awaiting brand</span>;
      }
      if (deliverable.status === 'approved' && deliverable.publishRequired) {
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Publish required</span>;
      }
      return <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">✓ Done</span>;
    })();
    const checklistPanel = (
      <aside className="space-y-4 lg:border-l lg:border-gray-100 lg:pl-6">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold text-nilink-ink">Deliverable brief</p>
        </div>
        <section className="border-t border-gray-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Brief notes
          </p>
          {displayInstructions ? (
            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              {displayInstructions}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-gray-400">
              No additional brief notes provided by the brand.
            </p>
          )}
        </section>
        {submissionConfig.briefItems.length > 0 && (
          <section className="border-t border-gray-100 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              Required checks
            </p>
            <ul className="mt-2 divide-y divide-gray-100">
              {submissionConfig.briefItems.map((item) => (
                <li key={item.label} className={checklistRowClass}>
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 ring-1 ring-gray-200">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800">{item.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">Included in the brand brief.</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {supportingEvidenceOptions.length > 0 && (
          <section className="border-t border-gray-100 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Submission readiness
            </p>
            <ul className="mt-2 divide-y divide-gray-100">
              <li className={readinessRowClass}>
                <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                  form.body.trim() ? 'bg-emerald-50/60 text-emerald-500 ring-emerald-100' : 'bg-rose-50/60 text-rose-300 ring-rose-100'
                }`}>
                  {form.body.trim() ? (
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-rose-300" />
                  )}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-medium text-slate-800">Summary is filled</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {form.body.trim() ? 'Ready' : 'Add a short summary before submitting.'}
                  </p>
                </div>
              </li>
              <li className={readinessRowClass}>
                <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                  form.url.trim() ? 'bg-emerald-50/60 text-emerald-500 ring-emerald-100' : 'bg-rose-50/60 text-rose-300 ring-rose-100'
                }`}>
                  {form.url.trim() ? (
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-rose-300" />
                  )}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-medium text-slate-800">Evidence link is added</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {form.url.trim() ? 'Ready' : 'Add the public evidence link to complete readiness.'}
                  </p>
                </div>
              </li>
            </ul>
          </section>
        )}
      </aside>
    );
    const updateSubmissionForm = (nextForm: SubmitForm, clearError?: boolean) => {
      const nextForms = { ...submitForms, [deliverable.id]: nextForm };
      setSubmitForms(nextForms);
      saveDraft(detail.deal.id, nextForms);
      if (clearError && submitErrors[deliverable.id]) {
        setSubmitErrors((prev) => {
          const next = { ...prev };
          delete next[deliverable.id];
          return next;
        });
      }
    };
    const renderEvidenceField = () => (
      <div>
        <label htmlFor={fieldIds.url} className={fieldLabelClass}>
          {primaryEvidenceOption?.label ?? 'Submission evidence'}
        </label>
        <p id={fieldIds.urlHelper} className={requiredHelperClass}>
          {primaryEvidenceOption?.helper ?? 'Link to the live post or content URL (must be publicly accessible).'}
        </p>
        <input
          id={fieldIds.url}
          ref={(node) => {
            if (!submitFieldRefs.current[deliverable.id]) {
              submitFieldRefs.current[deliverable.id] = { url: null, body: null };
            }
            submitFieldRefs.current[deliverable.id].url = node;
          }}
          className={fieldBaseClass}
          placeholder={primaryEvidenceOption?.placeholder ?? 'https://www.instagram.com/reel/… or Google Drive link'}
          value={form.url}
          aria-describedby={fieldIds.urlHelper}
          onChange={(e) => {
            updateSubmissionForm({ ...form, url: e.target.value }, true);
          }}
        />
      </div>
    );
    const renderDescriptionField = () => (
      <div>
        <label htmlFor={fieldIds.body} className={fieldLabelClass}>
          {submissionConfig.descriptionLabel}
        </label>
        <p id={fieldIds.bodyHelper} className={requiredHelperClass}>{submissionConfig.descriptionHelper}</p>
        <textarea
          id={fieldIds.body}
          ref={(node) => {
            if (!submitFieldRefs.current[deliverable.id]) {
              submitFieldRefs.current[deliverable.id] = { url: null, body: null };
            }
            submitFieldRefs.current[deliverable.id].body = node;
          }}
          className={`${fieldBaseClass} ${
            submitErrors[deliverable.id] ? 'border-red-300 focus:border-red-400' : ''
          }`}
          rows={5}
          maxLength={1500}
          placeholder={submissionConfig.descriptionPlaceholder}
          value={form.body}
          aria-invalid={Boolean(submitErrors[deliverable.id])}
          aria-describedby={submitErrors[deliverable.id] ? `${fieldIds.bodyHelper} ${fieldIds.bodyError}` : fieldIds.bodyHelper}
          onChange={(e) => {
            updateSubmissionForm({ ...form, body: e.target.value }, true);
          }}
        />
        {submitErrors[deliverable.id] && (
          <p id={fieldIds.bodyError} className="mt-1 text-xs font-semibold text-red-600">{submitErrors[deliverable.id]}</p>
        )}
      </div>
    );
    const renderNotesField = () => (
      <div>
        <label htmlFor={fieldIds.notes} className={fieldLabelClass}>Note to brand</label>
        <p id={fieldIds.notesHelper} className={optionalHelperClass}>Add any context, questions, or additional information for the brand.</p>
        <textarea
          id={fieldIds.notes}
          className={fieldBaseClass}
          rows={3}
          maxLength={1000}
          placeholder="Anything else the brand should know?"
          value={form.notes}
          aria-describedby={fieldIds.notesHelper}
          onChange={(e) => {
            updateSubmissionForm({ ...form, notes: e.target.value });
          }}
        />
      </div>
    );
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className={`h-1 w-full bg-gradient-to-r ${typeAccent.strip}`} />
        <div className="flex items-start gap-3 border-b border-gray-100 p-6 pb-5">
          <div className={`flex shrink-0 items-center justify-center rounded-xl ${typeAccent.iconWrap} ${mode === 'work_in_progress' ? 'h-11 w-11' : 'h-9 w-9'}`}>
            {typeMeta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-nilink-ink">{deliverable.title}</p>
            <p className="mt-0.5 text-xs text-gray-500">{typeMeta.label}</p>
            <p className={`text-xs ${mode === 'work_in_progress' ? 'mt-1 text-gray-500' : 'mt-0.5 text-gray-400'}`}>
              Due {deliverable.dueAt ? formatIsoDate(deliverable.dueAt) : 'TBD'} · Revisions {deliverable.revisionCountUsed}/{deliverable.revisionLimit}
            </p>
          </div>
          <div className={`flex shrink-0 flex-wrap items-center gap-2 ${mode === 'work_in_progress' ? 'justify-end' : ''}`}>
            {turnChip}
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          {projection.feedback && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span className="font-semibold">Brand feedback: </span>{projection.feedback}
            </div>
          )}

          {submissions.length > 1 && (
            <details className="mb-4">
              <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Submission history ({submissions.length})
              </summary>
              <ul className="mt-2 space-y-1.5">
                {submissions.map((submission) => (
                  <li key={submission.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-nilink-ink">v{submission.version}</span>
                      <span className="text-xs text-gray-400">{formatIsoDate(submission.submittedAt)}</span>
                    </div>
                    {submission.notes && <p className="mt-0.5 text-xs text-gray-500">{submission.notes}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {showSubmissionSentBanner ? (
            <>
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-900">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold">Submission sent</p>
                  {projection.latestSubmissionAt ? (
                    <p className="mt-0.5">{formatIsoDate(projection.latestSubmissionAt)}</p>
                  ) : null}
                </div>
              </div>
              {statusBanner ? (
                <div className={`mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs ${statusBanner.className}`}>
                  {statusBanner.icon}
                  <div>
                    <p className="font-semibold">{statusBanner.title}</p>
                    <p className="mt-0.5">{statusBanner.copy}</p>
                  </div>
                </div>
              ) : null}
              {projection.primaryAction?.key === 'mark_published' && isPublishableDeliverableType(deliverable.type) ? (
                <div className="mt-4 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor={`pub-url-${deliverable.id}`}>
                    Published content URL
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <input
                      id={`pub-url-${deliverable.id}`}
                      type="url"
                      inputMode="url"
                      placeholder="https://instagram.com/p/..."
                      value={publishUrlByDeliverable[deliverable.id] ?? ''}
                      onChange={(e) =>
                        setPublishUrlByDeliverable((prev) => ({ ...prev, [deliverable.id]: e.target.value }))
                      }
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-nilink-ink focus:outline-none focus:ring-1 focus:ring-nilink-ink"
                    />
                    <button
                      type="button"
                      disabled={pendingKey === `pub-${deliverable.id}`}
                      onClick={() => {
                        const raw = (publishUrlByDeliverable[deliverable.id] ?? '').trim();
                        if (!raw) {
                          setPublishUrlErrors((prev) => ({ ...prev, [deliverable.id]: 'Add the link to your published post.' }));
                          return;
                        }
                        if (!/^https?:\/\//i.test(raw)) {
                          setPublishUrlErrors((prev) => ({ ...prev, [deliverable.id]: 'URL must start with http:// or https://' }));
                          return;
                        }
                        setPublishUrlErrors((prev) => ({ ...prev, [deliverable.id]: null }));
                        void run(`pub-${deliverable.id}`, async () => {
                          await patchDeliverable(deliverable.id, { status: 'published', publishedUrl: raw });
                        });
                      }}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {pendingKey === `pub-${deliverable.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      Mark as Published
                    </button>
                  </div>
                  {publishUrlErrors[deliverable.id] ? (
                    <p className="text-xs text-red-600">{publishUrlErrors[deliverable.id]}</p>
                  ) : (
                    <p className="text-xs text-slate-500">Paste the live link to your post. The brand will use this to verify publication.</p>
                  )}
                </div>
              ) : null}
            </>
          ) : projection.primaryAction?.key === 'submit_work' ? (
            <>
              {statusBanner ? (
                <div className={`mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs ${statusBanner.className}`}>
                  {statusBanner.icon}
                  <div>
                    <p className="font-semibold">{statusBanner.title}</p>
                    <p className="mt-0.5">{statusBanner.copy}</p>
                  </div>
                </div>
              ) : null}
              {mode === 'work_in_progress' ? (
                <div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
                    <div className="space-y-7">
                      {renderEvidenceField()}
                      {renderDescriptionField()}
                      {renderNotesField()}
                    </div>

                    {checklistPanel}
                  </div>

                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {renderEvidenceField()}
                    {renderDescriptionField()}
                  </div>

                  <div className="mt-5">
                    {renderNotesField()}
                  </div>

                  <div className="mt-6">
                    {checklistPanel}
                  </div>

                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const renderSubmissionStageCard = ({
    title,
    description,
    deliverableMode,
    showCancellation,
    guardDeliverables,
  }: {
    title: string;
    description: string;
    deliverableMode: 'work_in_progress' | 'standard';
    showCancellation?: boolean;
    guardDeliverables?: boolean;
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
      <h3 className="text-base font-bold text-nilink-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-500">{description}</p>
      {(!guardDeliverables || detail.deliverables.length > 0) && (
        <>
          {detail.deliverables.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {detail.deliverables.map((del, idx) => {
                const isSelected = selectedDeliverableId === del.id;
                return (
                  <button
                    key={del.id}
                    type="button"
                    onClick={() => setSelectedDeliverableId(del.id)}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-180 ${getChipStyle(del.status, isSelected, del.type)}`}
                  >
                    {['approved', 'published', 'completed'].includes(del.status) && (
                      <CheckCircle className="h-3 w-3 shrink-0" />
                    )}
                    <span>Deliverable {idx + 1}</span>
                  </button>
                );
              })}
            </div>
          )}
          {renderSubmissionDeliverableCard(deliverableMode)}
        </>
      )}
      {showCancellation ? renderCancellationBlock() : null}
    </div>
  );

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col bg-nilink-page">
      <div className="dash-main-gutter-x flex flex-1 flex-col pb-2 pt-10 sm:pb-3 sm:pt-12">

        {/* ── 1. BACK LINK + DEAL HEADER ── */}
        <div className="mb-7">
          <Link href="/dashboard/deals" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" />
            Back to deals
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-nilink-ink sm:text-[2.1rem]">
            {deal.brandName?.toUpperCase()}<span className="text-nilink-accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
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

              {/* Next-action badge (stage name lives on the highlighted stepper step) */}
              <div className="flex flex-wrap items-center justify-start gap-3">
                {deal.status === 'cancelled' ? (
                  <p className="text-lg font-semibold tracking-tight text-slate-900">Deal cancelled</p>
                ) : null}
                {deal.status !== 'cancelled' ? (
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                      athleteAttentionDeliverableCount > 0
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {athleteAttentionDeliverableCount > 0
                      ? `Action needed (${athleteAttentionDeliverableCount})`
                      : 'All caught up'}
                  </span>
                ) : null}
              </div>

              {/* Progress stepper */}
              <div className="mt-6">
                <ProgressTracker stageId={stageProjection.stageId} cancelled={deal.status === 'cancelled'} />
              </div>

              {/* Metadata row */}
              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug text-slate-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-nilink-accent" />
                  <span className="font-medium text-slate-600">Current status</span>
                  <span className="text-slate-800">{stageProjection.statusLine}</span>
                </div>
                {latestActivity && latestActivityLabel && (
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug text-slate-500 sm:justify-end">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-600">Latest activity</span>
                    <span className="text-slate-800">{latestActivityLabel}</span>
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
                  <p className="mt-1 text-sm text-gray-500">Review and sign the contract to move the deal into Deliverables.</p>

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
                  <p className="mt-1 text-sm text-emerald-700">The agreement is signed. This deal is moving into Deliverables.</p>
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

                {/* Project lifecycle timeline */}
                <div className="mt-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Project timeline
                  </p>
                  <ol className="relative space-y-3 border-l border-gray-200 pl-5">
                    {/* Agreement signed */}
                    <li className="relative">
                      <span className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-white">
                        <svg className="h-2.5 w-2.5 text-emerald-600" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-nilink-ink">Agreement signed</p>
                          {detail.contract?.signedAt ? (
                            <p className="text-xs text-gray-400">
                              {formatIsoDateOnly(detail.contract.signedAt)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>

                    {/* Deliverables — parent node with nested children */}
                    {detail.deliverables.length > 0 && (
                      <li className="relative">
                        <span className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-white">
                          <svg className="h-2.5 w-2.5 text-emerald-600" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <p className="text-sm font-medium text-nilink-ink">Deliverables</p>
                        <ul className="mt-2 space-y-1.5 border-l border-gray-100 pl-4">
                          {detail.deliverables.map((d) => {
                            const subs = submissionsByDeliverable[d.id] ?? [];
                            const approvedUrlArtifact = subs
                              .filter((s) => s.status === 'approved')
                              .flatMap((s) => s.artifacts)
                              .find(
                                (a) =>
                                  a.kind === 'url' &&
                                  typeof a.ref === 'string' &&
                                  a.ref.trim().length > 0,
                              );
                            const linkUrl = d.publishedUrl ?? approvedUrlArtifact?.ref ?? null;
                            return (
                              <li
                                key={d.id}
                                className="flex items-center gap-2"
                              >
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                                <p className="min-w-0 truncate text-xs text-gray-600">
                                  <span className="font-medium text-gray-700">{d.title}</span>
                                  <span className="text-gray-400">
                                    {' · '}
                                    {labelForDeliverableType(d.type)}
                                  </span>
                                </p>
                                {linkUrl ? (
                                  <a
                                    href={linkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open published ${d.title}`}
                                    className="ml-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-nilink-accent"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    )}

                    {/* Payout finalized */}
                    <li className="relative">
                      <span className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-white">
                        <svg className="h-2.5 w-2.5 text-emerald-600" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-nilink-ink">Payout finalized</p>
                          {detail.payment?.paidAt ? (
                            <p className="text-xs text-gray-400">
                              {formatIsoDateOnly(detail.payment.paidAt)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  </ol>
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
                {stageProjection?.stageId === 'work_in_progress' &&
                  renderSubmissionStageCard({
                    title: 'Submit your work',
                    description: 'Complete the deliverable below and send it to the brand for review.',
                    deliverableMode: 'work_in_progress',
                    showCancellation: true,
                  })}

                {stageProjection?.stageId === 'review_revisions' &&
                  renderSubmissionStageCard({
                    title: deal.status === 'revision_requested' ? 'Revision requested' : 'Submission under review',
                    description: 'Complete the deliverable below and send it to the brand for review.',
                    deliverableMode: 'standard',
                    showCancellation: true,
                  })}

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
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
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

                {stageProjection && !['work_in_progress', 'review_revisions', 'completed', 'payment'].includes(stageProjection.stageId) &&
                  renderSubmissionStageCard({
                    title: stageProjection.stageLabel,
                    description: stageProjection.stageDescription,
                    deliverableMode: 'standard',
                    guardDeliverables: true,
                  })}
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


      </div>

      <div className="pointer-events-none sticky bottom-0 z-20" role="contentinfo" aria-label="Deal shortcuts">
        <div className="pointer-events-auto dash-main-gutter-x pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.1)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="relative">
                {(canShowCancelAction || canViewContractAction) && (
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
                        {canViewContractAction ? (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShowFooterMenu(false);
                              const url = detail.contract?.fileUrl;
                              if (url) window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="block w-full rounded-md px-2.5 py-1.5 text-left text-[11px] font-medium leading-4 text-slate-500 transition-colors duration-180 hover:bg-slate-50 hover:text-slate-700"
                          >
                            View contract
                          </button>
                        ) : null}
                        {canShowCancelAction ? (
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

              <div className="flex flex-wrap items-center justify-end gap-2">
                {canStickySubmit && selectedDeliverable ? (
                  <button
                    type="button"
                    disabled={pendingKey === `sub-${selectedDeliverable.id}` || stickyReadyCount < 2}
                    onClick={() =>
                      handleSubmitDeliverable(
                        selectedDeliverable,
                        stageProjection?.stageId === 'work_in_progress' ? 'work_in_progress' : 'standard',
                      )
                    }
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-[transform,filter,box-shadow] duration-180 motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:brightness-105 motion-reduce:hover:translate-y-0 motion-reduce:transform-none disabled:translate-y-0 disabled:opacity-50 ${stickyCtaAccentClass}`}
                  >
                    {pendingKey === `sub-${selectedDeliverable.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {detail.deliverables.length === 1
                      ? 'Submit deliverable'
                      : selectedDeliverable.status === 'revision_requested' || (submissionsByDeliverable[selectedDeliverable.id] ?? []).length > 0
                        ? `Resubmit: ${selectedDeliverable.title.length > 32 ? `${selectedDeliverable.title.slice(0, 32)}…` : selectedDeliverable.title}`
                        : `Submit: ${selectedDeliverable.title.length > 32 ? `${selectedDeliverable.title.slice(0, 32)}…` : selectedDeliverable.title}`}
                  </button>
                ) : canStickyUnderReview ? (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    Under review
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
