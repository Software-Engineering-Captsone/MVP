'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Check, FileEdit, History, Loader2, XCircle } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { authFetch } from '@/lib/authFetch';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { useApplicationsList, type ApplicationWithCampaign } from '@/hooks/api/useApplicationsList';

type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'offer_sent'
  | 'offer_declined'
  | 'rejected'
  | 'withdrawn';

type ApplicationTab =
  | 'all'
  | 'active'
  | 'closed';
type ApplicationSort = 'newest' | 'oldest' | 'campaign_az';
type RowActionError = {
  applicationId: string;
  action: 'edit' | 'withdraw' | 'reapply';
  message: string;
  retryPitch?: string;
  retryCampaignId?: string;
};

const PLACEHOLDER_IMAGE = '/brands_images/brand-01.svg';
const PIPELINE_STEPS = ['Applied', 'Review', 'Shortlist', 'Offer'] as const;
const EDIT_PITCH_RECOMMENDED_MIN = 80;
const EDIT_PITCH_MAX_LENGTH = 1000;
const EDIT_PROMPT_CHIPS = [
  { label: 'Audience fit', text: 'Audience fit: My audience aligns with this campaign because ' },
  { label: 'Relevant results', text: 'Relevant results: In previous collaborations, I delivered ' },
  { label: 'Content idea', text: 'Content idea: I would create ' },
] as const;
const EDIT_PROMPT_TEXTS = EDIT_PROMPT_CHIPS.map((chip) => chip.text);
const LOAD_ERROR_MESSAGE = 'Could not load applications. Refresh and try again.';
const NETWORK_ERROR_MESSAGE = 'Network issue while loading applications. Please try again.';
const UPDATE_ERROR_MESSAGE = 'Update failed. Check your connection and try again.';
const WITHDRAW_ERROR_MESSAGE = 'Withdraw failed. Check your connection and try again.';
const REAPPLY_ERROR_MESSAGE = 'Re-apply failed. Check your connection and try again.';
const TAB_ORDER: ApplicationTab[] = [
  'all',
  'active',
  'closed',
];

function tabLabel(tab: ApplicationTab): string {
  if (tab === 'all') return 'All';
  if (tab === 'active') return 'Active';
  if (tab === 'closed') return 'Closed';
  return 'All';
}

function normalizeStatus(row: ApplicationWithCampaign['application']): ApplicationStatus {
  const status = String(row.status ?? '');
  if (status === 'rejected' && row.withdrawnByAthlete === true) return 'withdrawn';
  if (status === 'withdrawn') return 'withdrawn';
  if (status === 'applied' || status === 'pending') return 'applied';
  if (status === 'under_review') return 'under_review';
  if (status === 'shortlisted' || status === 'approved') return 'shortlisted';
  if (status === 'offer_sent') return 'offer_sent';
  if (status === 'offer_declined') return 'offer_declined';
  return 'rejected';
}

function statusLabel(status: ApplicationStatus): string {
  if (status === 'under_review') return 'Under review';
  if (status === 'offer_sent') return 'Offer sent';
  if (status === 'offer_declined') return 'Offer declined';
  if (status === 'shortlisted') return 'Shortlisted';
  if (status === 'withdrawn') return 'Withdrawn';
  if (status === 'rejected') return 'Rejected';
  return 'Applied';
}

function statusClass(status: ApplicationStatus): string {
  if (status === 'offer_sent') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'offer_declined') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (status === 'shortlisted') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'under_review') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'withdrawn') return 'border-slate-200 bg-slate-100 text-slate-700';
  if (status === 'rejected') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-700';
}

function statusHelperCopy(status: ApplicationStatus): string {
  if (status === 'applied') {
    return 'Submitted successfully. The brand has not started reviewing your application yet.';
  }
  if (status === 'under_review') {
    return 'A brand reviewer is currently evaluating your submission.';
  }
  if (status === 'shortlisted') {
    return 'You made the shortlist. You may receive an offer next.';
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
  if (status === 'applied') return 0;
  if (status === 'under_review') return 1;
  if (status === 'shortlisted') return 2;
  if (status === 'offer_sent') return 3;
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
  const [activeTab, setActiveTab] = useState<ApplicationTab>('all');
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

  const tabCounts = useMemo<Record<ApplicationTab, number>>(() => {
    const counts: Record<ApplicationTab, number> = {
      all: sorted.length,
      active: 0,
      closed: 0,
    };
    for (const row of sorted) {
      const status = normalizeStatus(row.application);
      if (
        status === 'applied' ||
        status === 'under_review' ||
        status === 'shortlisted' ||
        status === 'offer_sent'
      ) {
        counts.active += 1;
      } else {
        counts.closed += 1;
      }
    }
    return counts;
  }, [sorted]);

  const metrics = useMemo(() => {
    let inReview = 0;
    let offersSent = 0;
    let closed = 0;
    for (const row of sorted) {
      const status = normalizeStatus(row.application);
      if (status === 'under_review') inReview += 1;
      if (status === 'offer_sent') offersSent += 1;
      if (status === 'offer_declined' || status === 'rejected' || status === 'withdrawn') {
        closed += 1;
      }
    }
    return {
      total: sorted.length,
      inReview,
      closed,
      offersSent,
    };
  }, [sorted]);

  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return sorted;
    return sorted.filter((row) => {
      const status = normalizeStatus(row.application);
      if (activeTab === 'active') {
        return (
          status === 'applied' ||
          status === 'under_review' ||
          status === 'shortlisted' ||
          status === 'offer_sent'
        );
      }
      return status === 'offer_declined' || status === 'rejected' || status === 'withdrawn';
    });
  }, [activeTab, sorted]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredByTab;
    return filteredByTab.filter((row) => {
      const campaignName = (row.campaign?.name ?? '').toLowerCase();
      const brandName = (row.campaign?.brandDisplayName ?? '').toLowerCase();
      return campaignName.includes(query) || brandName.includes(query);
    });
  }, [filteredByTab, searchQuery]);

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
          status: 'applied',
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
          subtitle="Track every submission in one compact pipeline view."
        />
      </div>

      <div className="dash-main-gutter-x min-h-0 flex-1 overflow-auto py-6">
        {!loading ? (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Total</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{metrics.total}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">In review</p>
                <p className="mt-1 text-lg font-bold text-blue-900">{metrics.inReview}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Closed</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{metrics.closed}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Offers sent</p>
                <p className="mt-1 text-lg font-bold text-emerald-900">{metrics.offersSent}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAB_ORDER.map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-nilink-accent bg-nilink-accent text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{tabLabel(tab)}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tabCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns or brands"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-nilink-accent focus:outline-none focus:ring-2 focus:ring-nilink-accent/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="applications-sort" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sort
              </label>
              <select
                id="applications-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ApplicationSort)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-nilink-accent focus:outline-none focus:ring-2 focus:ring-nilink-accent/20"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="campaign_az">Campaign A-Z</option>
              </select>
            </div>
          </div>
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
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading applications...
          </div>
        ) : null}

        {!loading ? (
          displayRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
              {tabCounts.all === 0 ? (
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
              ) : searchQuery.trim() ? (
                <div className="mx-auto max-w-md">
                  <p className="text-sm font-semibold text-gray-900">No search results</p>
                  <p className="mt-1 text-sm text-gray-600">
                    No applications match your current search. Try another campaign or brand term.
                  </p>
                </div>
              ) : (
                <div className="mx-auto max-w-md">
                  <p className="text-sm font-semibold text-gray-900">Nothing in this view</p>
                  <p className="mt-1 text-sm text-gray-600">
                    No applications are currently in {tabLabel(activeTab)}.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {displayRows.map((row) => {
                const status = normalizeStatus(row.application);
                const canEdit = status === 'applied';
                const canWithdraw = status === 'applied';
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
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {row.campaign?.name ?? 'Campaign unavailable'}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {row.campaign?.brandDisplayName ?? 'Brand'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {row.campaign?.id ? (
                              <Link
                                href={`/dashboard/search?campaignId=${encodeURIComponent(row.campaign.id)}`}
                                className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Open campaign
                              </Link>
                            ) : null}
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusClass(status)}`}>
                              {statusLabel(status)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                          <Calendar className="h-3.5 w-3.5" />
                          Applied {formatDate(row.application.createdAt)}
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-gray-600">
                          {statusHelperCopy(status)}
                        </p>

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
                          if (timeline.length === 0) return null;
                          return (
                            <div className="mt-3 rounded-lg border border-gray-100 bg-white p-2.5">
                              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                <History className="h-3.5 w-3.5" />
                                Status history
                              </div>
                              <ul className="space-y-2 border-l border-gray-200 pl-3">
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

                        {(canEdit || canWithdraw || canReapply || reapplyBlockedByDeadline) ? (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                            {canEdit ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700"
                                onClick={() => {
                                  setEditAppId(row.application.id);
                                  setEditPitch(row.application.pitch ?? '');
                                }}
                              >
                                <FileEdit className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            ) : null}
                            {canWithdraw ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                                onClick={() => void withdraw(row.application.id)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
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
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                                onClick={async () => {
                                  const campaignId = row.campaign?.id;
                                  if (!campaignId) return;
                                  const res = await authFetch(`/api/campaigns/${campaignId}/applications`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      pitch: row.application.pitch ?? '',
                                      athleteSnapshot: {},
                                      status: 'applied',
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
                              className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
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
              })}
            </ul>
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
