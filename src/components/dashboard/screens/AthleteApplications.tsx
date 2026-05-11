'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronRight, FileEdit, Search, XCircle } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { authFetch } from '@/lib/authFetch';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { useApplicationsList, type ApplicationWithCampaign } from '@/hooks/api/useApplicationsList';
import {
  applicationStatusLabel,
  type CanonicalApplicationStatus,
  normalizeApplicationStatus,
} from '@/lib/campaigns/status';

type ApplicationStatus = CanonicalApplicationStatus;

type ApplicationSort = 'newest' | 'oldest' | 'campaign_az';
type RowActionError = {
  applicationId: string;
  action: 'edit' | 'withdraw' | 'reapply';
  message: string;
  retryPitch?: string;
  retryCampaignId?: string;
};

const PLACEHOLDER_IMAGE = '/brands_images/brand-01.svg';
/** Muted row actions: slight button shape without strong CTA emphasis */
const APP_ROW_GHOST =
  'inline-flex items-center justify-center gap-1 rounded-md border border-transparent bg-gray-50/80 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100/90 hover:text-gray-900';
const APP_ROW_GHOST_DANGER =
  'inline-flex items-center justify-center gap-1 rounded-md border border-transparent bg-red-50/50 px-2.5 py-1 text-xs font-medium text-red-700/90 transition-colors hover:border-red-200/70 hover:bg-red-50 hover:text-red-800';
const APP_ROW_GHOST_ACCENT =
  'inline-flex items-center justify-center gap-1 rounded-md border border-transparent bg-emerald-50/50 px-2.5 py-1 text-xs font-medium text-emerald-800/90 transition-colors hover:border-emerald-200/70 hover:bg-emerald-50';
const PIPELINE_STEPS = ['Applied', 'Review', 'Shortlist', 'Offer'] as const;
const EDIT_PITCH_RECOMMENDED_MIN = 80;
const EDIT_PITCH_MAX_LENGTH = 1000;
const EDIT_PROMPT_CHIPS = [
  { label: 'Audience fit', text: 'Audience fit: My audience aligns with this campaign because ' },
  { label: 'Relevant results', text: 'Relevant results: In previous collaborations, I delivered ' },
  { label: 'Content idea', text: 'Content idea: I would create ' },
] as const;
const EDIT_PROMPT_TEXTS = EDIT_PROMPT_CHIPS.map((chip) => chip.text);
const UPDATE_ERROR_MESSAGE = 'Update failed. Check your connection and try again.';
const WITHDRAW_ERROR_MESSAGE = 'Withdraw failed. Check your connection and try again.';
const REAPPLY_ERROR_MESSAGE = 'Re-apply failed. Check your connection and try again.';
/** Still in the campaign application pipeline (before an offer is sent). */
function isApplicationPipelineActive(status: ApplicationStatus): boolean {
  return (
    status === 'pending' ||
    status === 'under_review' ||
    status === 'shortlisted' ||
    status === 'offer_drafted'
  );
}

const TERMINAL_DEAL_STATUSES = new Set(['closed', 'paid', 'cancelled', 'disputed']);

function isDealTerminal(dealStatus: string | null | undefined): boolean {
  return dealStatus != null && TERMINAL_DEAL_STATUSES.has(dealStatus);
}

type HandoffInfo = NonNullable<ApplicationWithCampaign['handoff']>;

function compactPastSummary(status: ApplicationStatus, handoff: HandoffInfo | null | undefined): string {
  if (status === 'withdrawn') return 'You withdrew this application.';
  if (status === 'declined') return 'The brand did not move forward with this application.';
  if (status === 'offer_declined') return 'You declined the offer.';
  if (status === 'offer_sent') {
    if (handoff?.dealId && handoff.dealStatus && !isDealTerminal(handoff.dealStatus)) {
      return 'Collaboration is active in Deals.';
    }
    if (handoff?.dealId && handoff.dealStatus && isDealTerminal(handoff.dealStatus)) {
      return 'This collaboration has ended.';
    }
    if (!handoff?.dealId && handoff?.offerStatus === 'sent') {
      return 'Respond in your Offers tab.';
    }
    return 'Offer activity continues in Deals or Offers.';
  }
  return '';
}

function normalizeStatus(row: ApplicationWithCampaign['application']): ApplicationStatus {
  if (row.withdrawnByAthlete === true) return 'withdrawn';
  return normalizeApplicationStatus(row.status);
}

function statusLabel(status: ApplicationStatus): string {
  return applicationStatusLabel(status);
}

function statusClass(status: ApplicationStatus): string {
  if (status === 'offer_sent') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'offer_drafted') return 'border-teal-200 bg-teal-50 text-teal-800';
  if (status === 'offer_declined') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (status === 'shortlisted') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'under_review') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'withdrawn') return 'border-slate-200 bg-slate-100 text-slate-700';
  if (status === 'declined') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-700';
}

function statusHelperCopy(status: ApplicationStatus): string {
  if (status === 'pending') {
    return 'Submitted successfully. The brand has not started reviewing your application yet.';
  }
  if (status === 'under_review') {
    return 'A brand reviewer is currently evaluating your submission.';
  }
  if (status === 'shortlisted') {
    return 'You made the shortlist. You may receive an offer next.';
  }
  if (status === 'offer_drafted') {
    return 'The brand is drafting your offer. You will see the formal offer under Offers once it is sent.';
  }
  if (status === 'offer_sent') {
    return 'An offer has been sent. Review details and respond in your Offers tab.';
  }
  if (status === 'offer_declined') {
    return 'This opportunity is closed because the offer was declined.';
  }
  if (status === 'withdrawn') {
    return 'You withdrew this application before it moved forward.';
  }
  return 'This application is closed and is no longer in consideration.';
}

function pipelineIndex(status: ApplicationStatus): number | null {
  if (status === 'pending') return 0;
  if (status === 'under_review') return 1;
  if (status === 'shortlisted') return 2;
  /** Offer drafted only — once sent, the recruit pipeline is complete (see `isPastRecruitStage`). */
  if (status === 'offer_drafted') return 3;
  return null;
}

/** No longer in the application / recruit flow — follow-up is Offers or Deals. */
function isPastRecruitStage(status: ApplicationStatus): boolean {
  return (
    status === 'offer_sent' ||
    status === 'offer_declined' ||
    status === 'declined' ||
    status === 'withdrawn'
  );
}

function compactApplicationCta(row: ApplicationWithCampaign, status: ApplicationStatus) {
  const h = row.handoff;
  const ctaClass =
    'inline-flex items-center gap-0.5 text-xs font-semibold text-nilink-accent hover:underline';

  if (status === 'offer_sent') {
    if (h?.offerStatus === 'accepted') {
      if (h.dealId) {
        const terminal = isDealTerminal(h.dealStatus);
        return (
          <Link href={`/dashboard/deals/${encodeURIComponent(h.dealId)}`} className={ctaClass}>
            {terminal ? 'View deal' : 'Open deal'}
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Link>
        );
      }
      return (
        <Link href="/dashboard/deals" className={ctaClass}>
          Open deals
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      );
    }
    if (h?.offerId && h.offerId.trim()) {
      return (
        <Link href={`/dashboard/offers?offer=${encodeURIComponent(h.offerId)}`} className={ctaClass}>
          View offer
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      );
    }
    return (
      <Link href="/dashboard/offers" className={ctaClass}>
        View offers
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </Link>
    );
  }
  if (status === 'offer_declined') {
    return <span className="text-xs text-gray-500">Offer declined</span>;
  }
  if (status === 'declined') {
    return <span className="text-xs text-gray-500">Not selected</span>;
  }
  if (status === 'withdrawn') {
    return <span className="text-xs text-gray-500">Withdrawn</span>;
  }
  return null;
}

function formatDate(value?: string): string {
  if (!value) return 'Recently';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sortedStatusHistory(
  entries: ApplicationWithCampaign['application']['statusHistory']
): { status: string; at: string }[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  return [...entries].sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    return String(a.at).localeCompare(String(b.at));
  });
}

function historyEntryLabel(raw: string): string {
  return statusLabel(
    normalizeStatus({
      id: '',
      campaignId: '',
      status: raw,
      withdrawnByAthlete: false,
    })
  );
}

function activityTimeMs(row: ApplicationWithCampaign): number {
  const updated = new Date(row.application.updatedAt ?? '').getTime();
  if (!Number.isNaN(updated)) return updated;
  const created = new Date(row.application.createdAt ?? '').getTime();
  if (!Number.isNaN(created)) return created;
  return 0;
}

export function AthleteApplications() {
  const { applications, isLoading: loading, error: appError, mutate: mutateApplications } = useApplicationsList();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editAppId, setEditAppId] = useState<string | null>(null);
  const [editPitch, setEditPitch] = useState('');
  const [activeSectionOpen, setActiveSectionOpen] = useState(true);
  const [pastSectionOpen, setPastSectionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ApplicationSort>('newest');
  const [rowActionError, setRowActionError] = useState<RowActionError | null>(null);
  const [restoringPitch, setRestoringPitch] = useState(false);
  const editingApplication = useMemo(
    () => applications.find((row) => row.application.id === editAppId) ?? null,
    [applications, editAppId]
  );
  const initialEditPitch = editingApplication?.application.pitch ?? '';

  const sorted = useMemo(() => {
    return [...applications].sort((a, b) => {
      const ta = activityTimeMs(a);
      const tb = activityTimeMs(b);
      const byTime = tb - ta;
      if (byTime !== 0) return byTime;
      return String(a.application.id).localeCompare(String(b.application.id));
    });
  }, [applications]);

  const metrics = useMemo(() => {
    let inReview = 0;
    let offersSent = 0;
    for (const row of sorted) {
      const status = normalizeStatus(row.application);
      if (status === 'under_review') inReview += 1;
      if (status === 'offer_sent') offersSent += 1;
    }
    return {
      inReview,
      offersSent,
    };
  }, [sorted]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter((row) => {
      const campaignName = (row.campaign?.name ?? '').toLowerCase();
      const brandName = (row.campaign?.brandDisplayName ?? '').toLowerCase();
      return campaignName.includes(query) || brandName.includes(query);
    });
  }, [sorted, searchQuery]);

  const displayRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ta = activityTimeMs(a);
      const tb = activityTimeMs(b);
      if (sortBy === 'newest') return tb - ta;
      if (sortBy === 'oldest') return ta - tb;
      if (sortBy === 'campaign_az') {
        const an = (a.campaign?.name ?? '').toLowerCase();
        const bn = (b.campaign?.name ?? '').toLowerCase();
        const byName = an.localeCompare(bn);
        if (byName !== 0) return byName;
        const byTime = tb - ta;
        if (byTime !== 0) return byTime;
        return String(a.application.id).localeCompare(String(b.application.id));
      }
      const byTime = tb - ta;
      if (byTime !== 0) return byTime;
      return String(a.application.id).localeCompare(String(b.application.id));
    });
  }, [filtered, sortBy]);

  const activeRows = useMemo(
    () =>
      displayRows.filter((row) => isApplicationPipelineActive(normalizeStatus(row.application))),
    [displayRows]
  );

  const pastRows = useMemo(
    () => displayRows.filter((row) => isPastRecruitStage(normalizeStatus(row.application))),
    [displayRows]
  );

  function renderApplicationListItem(row: ApplicationWithCampaign) {
    const status = normalizeStatus(row.application);
    const canEdit = status === 'pending';
    const canWithdraw = status === 'pending';
    const reapplyBlockedByDeadline =
      status === 'withdrawn' && row.campaign?.applicationDeadlinePassed === true;
    const canReapply =
      status === 'withdrawn' &&
      Boolean(row.campaign?.id) &&
      row.campaign?.applicationDeadlinePassed !== true;
    const active = pipelineIndex(status);
    const image =
      typeof row.campaign?.image === 'string' && row.campaign.image.trim()
        ? row.campaign.image
        : PLACEHOLDER_IMAGE;

    if (isPastRecruitStage(status)) {
      const pastSummary = compactPastSummary(status, row.handoff);
      return (
        <li
          key={row.application.id}
          className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
        >
          <div className="min-w-0">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-base font-semibold leading-snug tracking-tight text-gray-900">
                    {row.campaign?.name ?? 'Campaign unavailable'}
                  </p>
                  <p className="truncate text-sm font-medium leading-tight text-gray-600">
                    {row.campaign?.brandDisplayName ?? 'Brand'}
                  </p>
                </div>
                <span
                  className={`shrink-0 self-start rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide ${statusClass(status)}`}
                >
                  {statusLabel(status)}
                </span>
              </div>
              {pastSummary ? (
                <p className="line-clamp-2 text-xs leading-snug text-gray-500">{pastSummary}</p>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-gray-100 pt-2">
              <p className="text-[11px] leading-tight text-gray-400">
                <span className="font-medium uppercase tracking-wide text-gray-400">Applied</span>{' '}
                <time
                  dateTime={row.application.createdAt}
                  className="font-normal tabular-nums text-gray-600"
                >
                  {formatDate(row.application.createdAt)}
                </time>
              </p>
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                {row.applicationMessaging?.canViewThread ? (
                  <Link
                    href={`/dashboard/messages?application=${encodeURIComponent(row.application.id)}`}
                    className="text-xs font-semibold text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                  >
                    Messages
                  </Link>
                ) : null}
                {compactApplicationCta(row, status)}
              </div>
            </div>
          </div>
          {rowActionError?.applicationId === row.application.id ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-900">{rowActionError.message}</p>
              <p className="mt-1 text-[11px] text-amber-900/90">
                Retry now, or check your connection and try again in a moment.
              </p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-amber-900 underline underline-offset-2"
                onClick={() => void retryRowAction()}
              >
                Retry action
              </button>
            </div>
          ) : null}
        </li>
      );
    }

    return (
      <li key={row.application.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
            <ImageWithFallback
              src={image}
              alt={row.campaign?.name ?? 'Campaign'}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {row.campaign?.name ?? 'Campaign unavailable'}
              </p>
              <p className="truncate text-xs text-gray-500">
                {row.campaign?.brandDisplayName ?? 'Brand'}
              </p>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-gray-600">{statusHelperCopy(status)}</p>

            <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
              <div className="grid grid-cols-4 gap-2">
                {PIPELINE_STEPS.map((step, i) => {
                  const isComplete = active != null && i < active;
                  const isCurrent = active != null && i === active;
                  return (
                    <div key={step} className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                          isComplete
                            ? 'border-nilink-accent bg-nilink-accent text-white'
                            : isCurrent
                              ? 'border-nilink-accent bg-white text-nilink-accent'
                              : 'border-gray-300 bg-white text-gray-400'
                        }`}
                      >
                        {isComplete ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <span
                        className={`truncate text-[11px] ${
                          isComplete || isCurrent ? 'font-semibold text-gray-800' : 'text-gray-500'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {(() => {
              const timeline = sortedStatusHistory(row.application.statusHistory);
              if (timeline.length === 0) {
                return (
                  <p className="mt-3 text-[11px] text-gray-500">
                    <span className="font-medium text-gray-600">Applied</span> {formatDateTime(row.application.createdAt)}
                  </p>
                );
              }
              return (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Status history</p>
                  <ul className="ml-0.5 space-y-2 border-l border-gray-200 pl-3">
                    {timeline.map((entry, idx) => (
                      <li key={`${entry.at}-${entry.status}-${idx}`} className="relative">
                        <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full border border-gray-300 bg-white" />
                        <p className="text-xs font-semibold text-gray-900">{historyEntryLabel(entry.status)}</p>
                        <p className="text-[11px] text-gray-500">{formatDateTime(entry.at)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {row.campaign?.id || canEdit || canWithdraw || canReapply || reapplyBlockedByDeadline ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                {row.campaign?.id ? (
                  <Link
                    href={`/dashboard/search?campaignId=${encodeURIComponent(row.campaign.id)}`}
                    className={APP_ROW_GHOST}
                  >
                    Open campaign
                  </Link>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    className={APP_ROW_GHOST}
                    onClick={() => {
                      setEditAppId(row.application.id);
                      setEditPitch(row.application.pitch ?? '');
                    }}
                  >
                    <FileEdit className="h-3.5 w-3.5 opacity-70" />
                    Edit
                  </button>
                ) : null}
                {canWithdraw ? (
                  <button type="button" className={APP_ROW_GHOST_DANGER} onClick={() => void withdraw(row.application.id)}>
                    <XCircle className="h-3.5 w-3.5 opacity-70" />
                    Withdraw
                  </button>
                ) : null}
                {reapplyBlockedByDeadline ? (
                  <p className="text-xs text-gray-600">
                    You can&apos;t re-apply because the application deadline has passed.
                  </p>
                ) : null}
                {canReapply ? (
                  <button
                    type="button"
                    className={APP_ROW_GHOST_ACCENT}
                    onClick={async () => {
                      const campaignId = row.campaign?.id;
                      if (!campaignId) return;
                      const res = await authFetch(`/api/campaigns/${campaignId}/applications`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          pitch: row.application.pitch ?? '',
                          athleteSnapshot: {},
                          status: 'pending',
                        }),
                      });
                      const data = (await res.json()) as { error?: string };
                      if (!res.ok) {
                        setError(data.error || REAPPLY_ERROR_MESSAGE);
                        setRowActionError({
                          applicationId: row.application.id,
                          action: 'reapply',
                          message: data.error || REAPPLY_ERROR_MESSAGE,
                          retryCampaignId: campaignId,
                          retryPitch: row.application.pitch ?? '',
                        });
                        return;
                      }
                      if (rowActionError?.applicationId === row.application.id) {
                        setRowActionError(null);
                      }
                      await mutateApplications();
                    }}
                  >
                    Re-apply
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 border-t border-gray-100 pt-3">
              {row.applicationMessaging?.canViewThread ? (
                <Link
                  href={`/dashboard/messages?application=${encodeURIComponent(row.application.id)}`}
                  className={APP_ROW_GHOST}
                >
                  Open messages
                </Link>
              ) : (
                <p className="text-xs text-gray-500">
                  Messaging opens once the brand moves your application forward or starts the conversation.
                </p>
              )}
            </div>

            {rowActionError?.applicationId === row.application.id ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-900">{rowActionError.message}</p>
                <p className="mt-1 text-[11px] text-amber-900/90">
                  Retry now, or check your connection and try again in a moment.
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-amber-900 underline underline-offset-2"
                  onClick={() => void retryRowAction()}
                >
                  Retry action
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  const submitEdit = useCallback(async () => {
    if (!editAppId) return;
    setSuccessMessage(null);
    const res = await authFetch(`/api/applications/${editAppId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'edit', pitch: editPitch }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || UPDATE_ERROR_MESSAGE);
      setRowActionError({
        applicationId: editAppId,
        action: 'edit',
        message: data.error || UPDATE_ERROR_MESSAGE,
        retryPitch: editPitch,
      });
      return;
    }
    if (rowActionError?.applicationId === editAppId) {
      setRowActionError(null);
    }
    setEditAppId(null);
    setEditPitch('');
    setSuccessMessage('Application updated successfully.');
    await mutateApplications();
  }, [editAppId, editPitch, mutateApplications, rowActionError]);

  const requestCloseEditModal = useCallback(() => {
    if (!editAppId) return;
    if (editPitch !== initialEditPitch) {
      const ok = window.confirm('Discard unsaved changes?');
      if (!ok) return;
    }
    setEditAppId(null);
    setEditPitch('');
  }, [editAppId, editPitch, initialEditPitch]);

  const applyPromptChip = useCallback((chipText: string) => {
    setEditPitch((prev) => {
      let next = prev;
      for (const existingPrompt of EDIT_PROMPT_TEXTS) {
        if (existingPrompt === chipText) continue;
        next = next.split(existingPrompt).join('');
      }
      if (next.includes(chipText)) return next;
      const base = next.trimEnd();
      if (!base) return chipText;
      return `${base}\n\n${chipText}`;
    });
  }, []);

  const restorePreviousSavedPitch = useCallback(async () => {
    if (!editAppId) return;
    if (editPitch !== initialEditPitch) {
      const ok = window.confirm('Discard unsaved changes and restore your previous saved version?');
      if (!ok) return;
    }
    setRestoringPitch(true);
    setSuccessMessage(null);
    try {
      const res = await authFetch(`/api/applications/${editAppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'restore_previous_pitch' }),
      });
      const data = (await res.json()) as { error?: string; application?: { pitch?: string } };
      if (!res.ok) {
        setError(data.error || UPDATE_ERROR_MESSAGE);
        return;
      }
      setEditPitch(data.application?.pitch ?? '');
      setSuccessMessage('Previous version restored.');
      await mutateApplications();
    } finally {
      setRestoringPitch(false);
    }
  }, [editAppId, editPitch, initialEditPitch, mutateApplications]);

  const withdraw = useCallback(async (applicationId: string) => {
    setSuccessMessage(null);
    const ok = window.confirm('Withdraw this application?');
    if (!ok) return;
    const res = await authFetch(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'withdraw' }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || WITHDRAW_ERROR_MESSAGE);
      setRowActionError({
        applicationId,
        action: 'withdraw',
        message: data.error || WITHDRAW_ERROR_MESSAGE,
      });
      return;
    }
    if (rowActionError?.applicationId === applicationId) {
      setRowActionError(null);
    }
    await mutateApplications();
  }, [mutateApplications, rowActionError]);

  const retryRowAction = useCallback(async () => {
    if (!rowActionError) return;
    setSuccessMessage(null);
    if (rowActionError.action === 'reapply') {
      const campaignId = rowActionError.retryCampaignId;
      if (!campaignId) return;
      const res = await authFetch(`/api/campaigns/${campaignId}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitch: rowActionError.retryPitch ?? '',
          athleteSnapshot: {},
          status: 'pending',
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || REAPPLY_ERROR_MESSAGE);
        setRowActionError({
          ...rowActionError,
          message: data.error || REAPPLY_ERROR_MESSAGE,
        });
        return;
      }
      setRowActionError(null);
      await mutateApplications();
      return;
    }
    if (rowActionError.action === 'withdraw') {
      await withdraw(rowActionError.applicationId);
      return;
    }
    const res = await authFetch(`/api/applications/${rowActionError.applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'edit', pitch: rowActionError.retryPitch ?? '' }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || UPDATE_ERROR_MESSAGE);
      setRowActionError({
        ...rowActionError,
        message: data.error || UPDATE_ERROR_MESSAGE,
      });
      return;
    }
    setRowActionError(null);
    setEditAppId(null);
    setEditPitch('');
    await mutateApplications();
  }, [mutateApplications, rowActionError, withdraw]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-4 pt-5">
        <DashboardPageHeader
          title="Applications"
          subtitle="Active applications are on top. Open Past to see offers, outcomes, and reference."
        />
      </div>

      <div className="dash-main-gutter-x min-h-0 flex-1 overflow-auto py-6">
        {!loading ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">In review</p>
                <p
                  className="mt-2 text-4xl font-black text-nilink-ink"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {metrics.inReview}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Offers sent</p>
                <p
                  className="mt-2 text-4xl font-black text-nilink-ink"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {metrics.offersSent}
                </p>
              </div>
            </div>

            <div className="mb-4 mt-8 border-t border-gray-100 pt-6">
              <h2 className="mb-3 text-sm font-semibold text-nilink-ink">Your applications</h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    aria-hidden
                  />
                  <input
                    id="applications-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search applications by campaign or brand"
                    aria-label="Search applications by campaign or brand"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-nilink-accent focus:outline-none focus:ring-2 focus:ring-nilink-accent/20"
                  />
                </div>
                <div className="flex min-h-[42px] shrink-0 items-center gap-2 sm:w-auto sm:border-l sm:border-gray-200 sm:pl-4">
                  <label
                    htmlFor="applications-sort"
                    className="text-xs font-bold uppercase tracking-wider text-gray-400"
                  >
                    Sort
                  </label>
                  <select
                    id="applications-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as ApplicationSort)}
                    className="min-w-[10.5rem] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-nilink-accent focus:outline-none focus:ring-2 focus:ring-nilink-accent/20 sm:flex-initial"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="campaign_az">Campaign A-Z</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {(appError ?? error) ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {appError?.message ?? error}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {successMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-gray-200" />
                    <div className="h-3 w-32 rounded bg-gray-200" />
                  </div>
                  <div className="h-5 w-20 shrink-0 rounded-full bg-gray-200" />
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading ? (
          sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
              <div className="mx-auto max-w-md">
                <p className="text-sm font-semibold text-gray-900">No applications yet</p>
                <p className="mt-1 text-sm text-gray-600">
                  Start applying to brand campaigns to track progress here.
                </p>
                <Link
                  href="/dashboard/search"
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-nilink-accent px-4 py-2 text-sm font-semibold text-white hover:bg-nilink-accent-hover"
                >
                  Explore campaigns
                </Link>
              </div>
            </div>
          ) : displayRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
              <div className="mx-auto max-w-md">
                <p className="text-sm font-semibold text-gray-900">No search results</p>
                <p className="mt-1 text-sm text-gray-600">
                  No applications match your current search. Try another campaign or brand term.
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full divide-y divide-gray-200">
              <div className="py-1">
                <button
                  type="button"
                  id="applications-active-trigger"
                  aria-expanded={activeSectionOpen}
                  aria-controls="applications-active-panel"
                  onClick={() => setActiveSectionOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-3 text-left transition-colors hover:bg-gray-50 sm:px-0"
                >
                  <span className="text-sm font-semibold text-gray-700">
                    Active applications{' '}
                    <span className="font-normal text-gray-500">({activeRows.length})</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${activeSectionOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {activeSectionOpen ? (
                  <div id="applications-active-panel" role="region" aria-labelledby="applications-active-trigger">
                    {activeRows.length === 0 ? (
                      <p className="pb-2 pt-1 text-sm text-gray-500">No active applications…</p>
                    ) : (
                      <ul className="space-y-3 pb-2 pt-1">{activeRows.map((row) => renderApplicationListItem(row))}</ul>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="py-1">
                <button
                  type="button"
                  id="applications-past-trigger"
                  aria-expanded={pastSectionOpen}
                  aria-controls="applications-past-panel"
                  onClick={() => setPastSectionOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-3 text-left transition-colors hover:bg-gray-50 sm:px-0"
                >
                  <span className="text-sm font-semibold text-gray-700">
                    Past applications{' '}
                    <span className="font-normal text-gray-500">({pastRows.length})</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${pastSectionOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {pastSectionOpen ? (
                  <div id="applications-past-panel" role="region" aria-labelledby="applications-past-trigger">
                    {pastRows.length === 0 ? (
                      <p className="pb-2 pt-1 text-sm text-gray-500">No past applications yet.</p>
                    ) : (
                      <ul className="space-y-3 pb-2 pt-1">{pastRows.map((row) => renderApplicationListItem(row))}</ul>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )
        ) : null}
      </div>

      {editAppId ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={requestCloseEditModal}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Edit application</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update your pitch for {editingApplication?.campaign?.name ?? 'this campaign'}. You can edit it before
              review starts.
            </p>
            <textarea
              value={editPitch}
              onChange={(e) => setEditPitch(e.target.value)}
              rows={4}
              maxLength={EDIT_PITCH_MAX_LENGTH}
              className="mt-4 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EDIT_PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
                  onClick={() => applyPromptChip(chip.text)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <p className="text-gray-500">
                Recommended: about {EDIT_PITCH_RECOMMENDED_MIN}+ characters for context (optional).
              </p>
              <p className="text-gray-500">
                {editPitch.length}/{EDIT_PITCH_MAX_LENGTH}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-xs font-semibold text-gray-600 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  restoringPitch ||
                  (editPitch === initialEditPitch && editingApplication?.application.hasPreviousPitch !== true)
                }
                onClick={() => {
                  if (editPitch !== initialEditPitch) {
                    setEditPitch(initialEditPitch);
                    return;
                  }
                  void restorePreviousSavedPitch();
                }}
              >
                {editPitch !== initialEditPitch ? 'Reset unsaved edits' : 'Restore last saved'}
              </button>
              <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                onClick={requestCloseEditModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-nilink-accent px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void submitEdit()}
              >
                Save changes
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
