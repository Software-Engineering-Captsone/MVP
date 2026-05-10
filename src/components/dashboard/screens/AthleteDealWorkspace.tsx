'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
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
  stageProgress,
  STAGE_ORDER,
} from '@/lib/deals/stageProjection';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

type SubmitForm = { url: string; body: string; notes: string };

function stageStepLabel(step: (typeof STAGE_ORDER)[number]): string {
  const map: Record<(typeof STAGE_ORDER)[number], string> = {
    agreement: 'Agreement',
    work_in_progress: 'Work',
    review_revisions: 'Review',
    completed: 'Complete',
    payment: 'Payout',
    closed: 'Done',
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
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`min-w-0 text-[11px] font-semibold leading-tight ${current ? 'text-nilink-ink' : done ? 'text-emerald-700' : 'text-gray-500'}`}>
              {stageStepLabel(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function athleteNextActionCopy(detail: ApiDealDetail, stageProjection: ReturnType<typeof buildDealStageProjection> | null): string {
  const owner = detail.deal.nextActionOwner;
  if (owner === 'athlete') {
    return detail.deal.nextActionLabel || (stageProjection?.primaryAction?.owner === 'athlete' ? stageProjection.primaryAction.label : 'Your next step is ready.');
  }
  if (owner === 'brand') return 'Waiting for the brand to take the next step.';
  if (owner === 'system') return detail.deal.nextActionLabel || stageProjection?.statusLine || 'System update in progress.';
  if (stageProjection?.primaryAction?.owner === 'athlete') return stageProjection.primaryAction.label;
  return detail.deal.nextActionLabel || 'No further action';
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
  const deliverablesRef = useRef<HTMLElement | null>(null);

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
  const title = terms?.compensationLine || detail?.deal.campaignName || 'NIL partnership';
  const brandName = detail?.deal.brandName?.trim() || 'Brand';
  const compensationAmount = detail ? compensationAmountFromDealSnapshot(detail.deal.termsSnapshot) : 0;
  const compensationLine =
    terms?.compensationLine ||
    (compensationAmount > 0 ? `USD ${compensationAmount.toLocaleString()}` : 'Compensation per agreed offer');
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

  return (
    <div className="flex min-h-full flex-col bg-nilink-page font-sans text-nilink-ink">
      <header className="shrink-0 border-b border-gray-100 bg-white dash-main-gutter-x py-4">
        <Link
          href="/dashboard/deals"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to deals
        </Link>
        <div className="mt-4">
          <DashboardPageHeader title={title} subtitle={`${brandName}${detail.deal.campaignName ? ` · ${detail.deal.campaignName}` : ''}`} />
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

        <div className="space-y-6">
          {stageProjection ? (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-nilink-ink">{stageProjection.stageLabel}</h2>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{stageProjection.statusLine}</p>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">{stageProjection.stageDescription}</p>
                  <p className="mt-3 text-sm font-semibold text-nilink-accent">
                    {athleteNextActionCopy(detail, stageProjection)}
                  </p>
                </div>
                {stageProjection.primaryAction?.enabled &&
                (stageProjection.primaryAction.key === 'submit_work' || stageProjection.primaryAction.key === 'mark_published') ? (
                  <button
                    type="button"
                    onClick={() => deliverablesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="rounded-xl bg-nilink-accent px-4 py-2 text-sm font-bold text-white hover:bg-nilink-accent-hover"
                  >
                    Go to deliverables
                  </button>
                ) : null}
              </div>
              <div className="mt-5 border-t border-gray-100 pt-5">
                <ProgressTracker stageId={stageProjection.stageId} />
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-bold text-nilink-ink">Deal terms</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Brand</dt>
                <dd className="mt-1 font-semibold text-nilink-ink">{brandName}</dd>
              </div>
              {detail.deal.campaignName ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Campaign</dt>
                  <dd className="mt-1 font-semibold text-nilink-ink">{detail.deal.campaignName}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Compensation</dt>
                <dd className="mt-1 font-semibold text-nilink-ink">{compensationLine}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deliverables</dt>
                <dd className="mt-1 font-semibold text-nilink-ink">{deliverableCountLine}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-bold text-nilink-ink">Next action</h2>
            <p className="mt-2 text-sm text-gray-600">
              {stageProjection?.primaryAction?.enabled
                ? 'Complete this step to keep the deal moving.'
                : stageProjection?.primaryAction?.reason ?? 'No action is required from you right now.'}
            </p>
            {detail.contract?.status === 'sent_for_signature' ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                {detail.contract.fileUrl?.trim() ? (
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
                <label className={`mt-3 flex items-start gap-2 text-sm ${detail.contract.fileUrl?.trim() ? 'text-gray-700' : 'text-gray-400'}`}>
                  <input
                    type="checkbox"
                    checked={contractAgreementChecked}
                    disabled={!detail.contract.fileUrl?.trim()}
                    onChange={(e) => setContractAgreementChecked(e.target.checked)}
                    className="mt-1"
                  />
                  I have reviewed this contract and agree to proceed with this deal.
                </label>
                <button
                  type="button"
                  disabled={pendingKey === 'sign' || !contractAgreementChecked || !detail.contract.fileUrl?.trim()}
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
            ) : null}
            {detail.deal.status === 'cancellation_requested' ? (
              cancellationRequester === 'athlete' ? (
                <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm font-medium text-yellow-800">Cancellation Requested</p>
                  <p className="mt-1 text-sm text-yellow-700">Awaiting the brand&apos;s response.</p>
                </div>
              ) : (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
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
              )
            ) : !['cancelled', 'closed', 'disputed', 'paid', 'created', 'contract_pending'].includes(detail.deal.status) && showCancelModal ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
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
            ) : null}
          </section>

          {stageProjection?.stageId !== 'agreement' && detail.deliverables.length > 0 ? (
            <section ref={deliverablesRef} className="scroll-mt-24">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Deliverables</h2>
              <div className="space-y-4">
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
            </section>
          ) : null}

          {detail.payment && (stageProjection?.stageId === 'completed' || stageProjection?.stageId === 'payment' || stageProjection?.stageId === 'closed') ? (
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
              <h2 className="text-sm font-bold text-emerald-900">Payout</h2>
              <p className="mt-2 text-sm font-semibold text-emerald-900">
                {detail.payment.currency} {detail.payment.amount.toLocaleString()} · {paymentStatusCopy(detail.payment.status)}
              </p>
              <p className="mt-1 text-xs text-emerald-800/90">
                {detail.payment.paidAt ? `Paid ${formatIsoDate(detail.payment.paidAt)}` : 'Payout will update once the brand marks it paid.'}
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-nilink-ink">Timeline</h2>
            <ul className="mt-3 space-y-2">
              {timelineRows.map((activity) => (
                <li key={activity.id} className="text-sm text-gray-700">
                  <span className="font-semibold">{activitySummary(activity)}</span>
                  <span className="ml-2 text-xs text-gray-400">{formatIsoDate(activity.createdAt)}</span>
                </li>
              ))}
              {timelineRows.length === 0 ? <li className="text-sm text-gray-400">No major updates yet.</li> : null}
            </ul>
          </section>

          {/* Request cancellation — only shown for post-contract, non-terminal states */}
          {!['created', 'contract_pending', 'cancelled', 'closed', 'disputed', 'paid', 'cancellation_requested'].includes(detail.deal.status) && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-red-500 hover:underline"
              >
                Request cancellation…
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
