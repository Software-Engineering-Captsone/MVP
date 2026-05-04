'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, ChevronRight, Handshake, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { authFetch } from '@/lib/authFetch';
import {
  activitySummary,
  createDeliverableSubmission,
  dealsUseMocks,
  fetchDealDetail,
  fetchDealsList,
  fetchSubmissionsForDeliverable,
  formatIsoDate,
  formatShortId,
  humanizeDealStatus,
  compensationAmountFromDealSnapshot,
  parseTermsSnapshot,
  patchContractStatus,
  getMockAthleteDealDetail,
  getMockAthleteDeals,
  getMockAthleteSubmissions,
  type ApiDeal,
  type ApiDealDetail,
  type ApiSubmission,
} from '@/lib/deals/dashboardDealsClient';
import {
  buildDealStageProjection,
  buildDeliverableProjection,
  contractStatusCopy,
  filterMainTimelineActivities,
  stageProgress,
  STAGE_ORDER,
} from '@/lib/deals/stageProjection';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

type ListTab = 'open' | 'done';
type AthleteDealSection = 'needs_action' | 'awaiting_review' | 'in_progress' | 'completed';
type UrgencyLevel = 'overdue' | 'due_soon' | 'needs_signature' | 'in_review' | 'on_track';

const URGENCY_PRIORITY: Record<UrgencyLevel, number> = {
  overdue: 0,
  due_soon: 1,
  needs_signature: 2,
  in_review: 3,
  on_track: 4,
};

function urgencyBadgeCopy(level: UrgencyLevel): string {
  if (level === 'overdue') return 'Overdue';
  if (level === 'due_soon') return 'Due in 72h';
  if (level === 'needs_signature') return 'Needs Signature';
  if (level === 'in_review') return 'Brand Reviewing';
  return 'On Track';
}

function urgencyBadgeClass(level: UrgencyLevel): string {
  if (level === 'overdue') return 'bg-red-100 text-red-700';
  if (level === 'due_soon') return 'bg-amber-100 text-amber-700';
  if (level === 'needs_signature') return 'bg-indigo-100 text-indigo-700';
  if (level === 'in_review') return 'bg-blue-100 text-blue-700';
  return 'bg-emerald-100 text-emerald-700';
}

function isDoneDeal(d: ApiDeal): boolean {
  return d.status === 'paid' || d.status === 'closed' || d.status === 'cancelled';
}

function nextOwnerLabel(owner: ApiDeal['nextActionOwner']): string {
  if (owner === 'brand') return 'Brand';
  if (owner === 'athlete') return 'You (athlete)';
  if (owner === 'system') return 'System';
  return '—';
}

function submissionTierLabel(notes: string): string {
  if (notes.startsWith('[Draft]')) return 'Draft';
  if (notes.startsWith('[Final]')) return 'Final';
  return 'Submission';
}

function athleteDealCardTitle(deal: ApiDeal): string {
  const t = parseTermsSnapshot(deal.termsSnapshot);
  const line = (t?.compensationLine ?? '').trim();
  if (line) return line;
  const notes = (t?.notes ?? '').trim();
  if (notes) return notes.length > 56 ? `${notes.slice(0, 56)}…` : notes;
  return 'NIL partnership';
}

function athleteDealCardSubtitle(deal: ApiDeal): string {
  return `Brand · ${formatShortId(deal.brandUserId)}`;
}

function urgencyMetaForDeal(deal: ApiDeal): { level: UrgencyLevel; nearestDueAt: string | null } {
  const terms = parseTermsSnapshot(deal.termsSnapshot);
  const dueAts = (terms?.frozenDeliverables ?? [])
    .map((d) => d.dueAt)
    .filter((dueAt): dueAt is string => typeof dueAt === 'string' && dueAt.length > 0);
  const nowMs = Date.now();
  const soonMs = nowMs + 72 * 60 * 60 * 1000;

  let nearestDueAt: string | null = null;
  let hasOverdue = false;
  let hasDueSoon = false;
  for (const dueAt of dueAts) {
    const dueMs = new Date(dueAt).getTime();
    if (Number.isNaN(dueMs)) continue;
    if (!nearestDueAt || dueMs < new Date(nearestDueAt).getTime()) nearestDueAt = dueAt;
    if (dueMs < nowMs) hasOverdue = true;
    else if (dueMs <= soonMs) hasDueSoon = true;
  }

  if (hasOverdue) return { level: 'overdue', nearestDueAt };
  if (hasDueSoon) return { level: 'due_soon', nearestDueAt };

  const label = (deal.nextActionLabel || '').toLowerCase();
  const needsSignature =
    label.includes('sign') ||
    (label.includes('contract') && (label.includes('agree') || label.includes('signature')));
  if (needsSignature) return { level: 'needs_signature', nearestDueAt };

  const inReview = deal.status === 'under_review' || label.includes('review');
  if (inReview) return { level: 'in_review', nearestDueAt };

  return { level: 'on_track', nearestDueAt };
}

function cardPrimaryCta(deal: ApiDeal, urgency: UrgencyLevel): string {
  if (urgency === 'needs_signature') return 'Sign contract';
  if (urgency === 'overdue' || urgency === 'due_soon') return 'Submit deliverable';
  if (urgency === 'in_review') return 'View feedback';
  if (deal.nextActionOwner === 'athlete') return 'Take action';
  if (deal.status === 'paid' || deal.status === 'closed') return 'Track payout';
  return 'Open deal';
}

function cardStageMeta(deal: ApiDeal): { label: string; value: string } {
  const terms = parseTermsSnapshot(deal.termsSnapshot);
  const label = (deal.nextActionLabel || '').toLowerCase();
  if (label.includes('sign') || (label.includes('contract') && (label.includes('agree') || label.includes('signature')))) {
    return { label: 'Stage', value: 'Agreement & signature' };
  }
  if (deal.status === 'under_review' || label.includes('review')) {
    return { label: 'Stage', value: 'Review & Revisions' };
  }
  if (deal.status === 'paid' || deal.status === 'closed') {
    return { label: 'Stage', value: 'Payout Complete' };
  }
  if (deal.status === 'payment_pending') {
    return { label: 'Stage', value: 'Payout Processing' };
  }
  return { label: 'Compensation', value: terms?.compensationLine ?? 'Sponsorship deal' };
}

function cardProgressIndex(deal: ApiDeal): number {
  const label = (deal.nextActionLabel || '').toLowerCase();
  if (deal.status === 'created' || deal.status === 'contract_pending' || label.includes('sign')) return 0;
  if (deal.status === 'under_review' || label.includes('review') || label.includes('revision')) return 2;
  if (deal.status === 'payment_pending' || deal.status === 'paid' || deal.status === 'closed') return 3;
  return 1;
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

export function DealManagement({ initialDealId = null }: { initialDealId?: string | null }) {
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [tab, setTab] = useState<ListTab>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiDealDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submissionsByDeliverable, setSubmissionsByDeliverable] = useState<Record<string, ApiSubmission[]>>({});
  const [campaignTitle, setCampaignTitle] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [contractAgreementChecked, setContractAgreementChecked] = useState(false);
  const [openIntent, setOpenIntent] = useState<'default' | 'feedback'>('default');
  const [highlightFeedbackSection, setHighlightFeedbackSection] = useState(false);
  const deliverablesSectionRef = useRef<HTMLElement | null>(null);
  const [submitForms, setSubmitForms] = useState<
    Record<string, { tier: 'draft' | 'final'; url: string; body: string; notes: string }>
  >({});
  const [submitErrors, setSubmitErrors] = useState<Record<string, string | null>>({});

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchDealsList();
      if (rows.length === 0 && dealsUseMocks()) {
        setDeals(getMockAthleteDeals());
      } else {
        setDeals(rows);
      }
    } catch (e) {
      if (dealsUseMocks()) {
        setDeals(getMockAthleteDeals());
        setError(e instanceof Error ? `${e.message} (demo deals)` : 'Using demo deals');
      } else {
        setDeals([]);
        setError(e instanceof Error ? e.message : 'Failed to load deals');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filteredDeals = useMemo(() => deals.filter((d) => (tab === 'done' ? isDoneDeal(d) : !isDoneDeal(d))), [deals, tab]);

  const sectionForDeal = useCallback((deal: ApiDeal): AthleteDealSection => {
    if (isDoneDeal(deal)) return 'completed';
    if (deal.nextActionOwner === 'athlete') return 'needs_action';
    if (deal.status === 'under_review' || deal.nextActionLabel.toLowerCase().includes('review')) {
      return 'awaiting_review';
    }
    return 'in_progress';
  }, []);

  const groupedOpenDeals = useMemo(() => {
    const out: Record<Exclude<AthleteDealSection, 'completed'>, ApiDeal[]> = {
      needs_action: [],
      awaiting_review: [],
      in_progress: [],
    };
    for (const deal of filteredDeals) {
      const section = sectionForDeal(deal);
      if (section === 'completed') continue;
      out[section].push(deal);
    }
    const sortDeals = (a: ApiDeal, b: ApiDeal) => {
      const aUrgency = urgencyMetaForDeal(a);
      const bUrgency = urgencyMetaForDeal(b);
      const byUrgency = URGENCY_PRIORITY[aUrgency.level] - URGENCY_PRIORITY[bUrgency.level];
      if (byUrgency !== 0) return byUrgency;

      const aDue = aUrgency.nearestDueAt ? new Date(aUrgency.nearestDueAt).getTime() : Number.POSITIVE_INFINITY;
      const bDue = bUrgency.nearestDueAt ? new Date(bUrgency.nearestDueAt).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;

      return b.updatedAt.localeCompare(a.updatedAt);
    };
    out.needs_action.sort(sortDeals);
    out.awaiting_review.sort(sortDeals);
    out.in_progress.sort(sortDeals);
    return out;
  }, [filteredDeals, sectionForDeal]);

  const tabCounts = useMemo(
    () => ({
      open: deals.filter((d) => !isDoneDeal(d)).length,
      done: deals.filter((d) => isDoneDeal(d)).length,
    }),
    [deals]
  );

  const totalEarnings = useMemo(
    () => deals.reduce((sum, d) => sum + compensationAmountFromDealSnapshot(d.termsSnapshot), 0),
    [deals]
  );

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
        }),
      );
      setSubmissionsByDeliverable(subMap);
      const initForms: Record<string, { tier: 'draft' | 'final'; url: string; body: string; notes: string }> = {};
      for (const del of d.deliverables) {
        initForms[del.id] = { tier: 'draft', url: '', body: '', notes: '' };
      }
      setSubmitForms(initForms);
      setSubmitErrors({});
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
      if (dealsUseMocks()) {
        const mockDetail = getMockAthleteDealDetail(dealId);
        setDetail(mockDetail);
        if (mockDetail) {
          const mapped: Record<string, ApiSubmission[]> = {};
          for (const del of mockDetail.deliverables) {
            mapped[del.id] = getMockAthleteSubmissions(del.id);
          }
          setSubmissionsByDeliverable(mapped);
        } else {
          setSubmissionsByDeliverable({});
        }
      } else {
        setDetail(null);
        setDetailError(e instanceof Error ? e.message : 'Could not load deal');
        setSubmissionsByDeliverable({});
      }
      setSubmitErrors({});
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const submitTemplates = useMemo(
    () => ({
      draft: 'Draft for brand review. Happy to revise based on feedback.',
      final: 'Final submission ready for approval and payout processing.',
    }),
    []
  );

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setDetail(null);
      setDetailError(null);
      setSubmissionsByDeliverable({});
      setOpenIntent('default');
    }
  }, [selectedId, loadDetail]);

  const refreshFromRealtime = useCallback(() => {
    void loadList();
    if (selectedId) void loadDetail(selectedId);
  }, [loadList, loadDetail, selectedId]);
  useDealsRealtimeRefresh({ enabled: true, dealId: selectedId, onInvalidate: refreshFromRealtime });

  useEffect(() => {
    if (!initialDealId) return;
    setSelectedId(initialDealId);
  }, [initialDealId]);

  useEffect(() => {
    setContractAgreementChecked(false);
  }, [selectedId, detail?.contract?.id, detail?.contract?.status]);

  useEffect(() => {
    if (openIntent !== 'feedback' || !detail) return;
    deliverablesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightFeedbackSection(true);
    const t = window.setTimeout(() => setHighlightFeedbackSection(false), 2200);
    return () => window.clearTimeout(t);
  }, [openIntent, detail]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setPendingKey(key);
    setActionError(null);
    try {
      await fn();
      if (selectedId) await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPendingKey(null);
    }
  };

  const yourTurn = (d: ApiDeal) => d.nextActionOwner === 'athlete';
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
  const stageId = stageProjection?.stageId ?? null;
  const showDeliverablesSection = stageId !== 'agreement' && (detail?.deliverables.length ?? 0) > 0;
  const showTimelineSection = stageId !== 'agreement';
  const showPayoutSection = stageId === 'completed' || stageId === 'payment' || stageId === 'closed';
  const showAdditionalDetails = stageId === 'agreement' || stageId === 'payment' || stageId === 'closed';
  const timelineStartsCollapsed = stageId === 'work_in_progress' || stageId === 'review_revisions';
  const nextActionHint =
    stageId === 'agreement'
      ? 'Handle contract setup and signature to unlock execution.'
      : stageId === 'work_in_progress'
        ? 'Focus on creating and submitting pending deliverables.'
        : stageId === 'review_revisions'
          ? 'Review brand notes and resubmit any requested changes.'
          : stageId === 'completed'
            ? 'Deliverables are complete. Keep an eye on payout progress.'
            : stageId === 'payment'
              ? 'Payout is being processed through the agreed release flow.'
              : 'No additional work is required for this deal.';

  return (
    <div className="flex h-full min-h-full flex-col bg-nilink-page font-sans text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white py-8">
        <div className="relative">
          <DashboardPageHeader title="Deals" subtitle="Agreed terms, submissions, and payouts" className="mb-6" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl bg-nilink-sidebar p-6 shadow-xl">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-nilink-accent-bright/15 blur-2xl" />
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Agreed value (est.)</p>
              <p className="mt-2 text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                ${totalEarnings.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-400">From accepted offer terms</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Open Deals</p>
              <p className="mt-2 text-4xl font-black text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {tabCounts.open}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Completed</p>
              <p className="mt-2 text-4xl font-black text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {tabCounts.done}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-8 pt-5 dash-main-gutter-x">
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-gray-700">
            Your deals{' '}
            <span className="font-normal text-gray-400">
              ({filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'} in this view)
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter deals">
              {(['open', 'done'] as const).map((t) => {
                const selected = tab === t;
                const label = t === 'open' ? 'In progress' : 'Done';
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setTab(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition sm:text-[13px] ${
                      selected
                        ? 'border-gray-400 bg-gray-100 text-gray-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}{' '}
                    <span className={selected ? 'text-gray-500' : 'text-gray-400'}>({tabCounts[t]})</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void loadList()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : deals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-nilink-accent-soft text-nilink-accent">
              <Handshake className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="mt-5 text-lg font-bold text-nilink-ink">No active partnerships yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
              When you accept an offer, your deal appears here with contract steps, deliverables, and payout tracking.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard/offers"
                className="inline-flex rounded-xl bg-nilink-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-nilink-accent-hover"
              >
                View offers
              </Link>
              <Link
                href="/dashboard/campaigns"
                className="inline-flex rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Browse campaigns
              </Link>
            </div>
          </div>
        ) : tab === 'done' ? (
          <div className="space-y-4">
            {filteredDeals.length === 0 ? (
              <p className="rounded-xl border border-gray-100 bg-white py-10 text-center text-sm text-gray-500">
                No completed deals in this tab. Switch to <span className="font-semibold">In progress</span> for active work.
              </p>
            ) : null}
            {filteredDeals.map((deal) => {
              const stageMeta = cardStageMeta(deal);
              const progressIndex = cardProgressIndex(deal);
              return (
                <motion.div
                  key={deal.id}
                  layout
                  className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
                  onClick={() => setSelectedId(deal.id)}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Deal</p>
                      <h3 className="text-xl font-bold leading-tight text-nilink-ink sm:text-2xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {athleteDealCardTitle(deal)}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-gray-500">{athleteDealCardSubtitle(deal)}</p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-700">{stageMeta.label}:</span> {stageMeta.value}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-400">{humanizeDealStatus(deal.status)}</span>
                  </div>
                  <p className="text-sm text-gray-600">Next step: {deal.nextActionLabel}</p>
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {['Agreement', 'Execution', 'Review', 'Payout'].map((step, i) => {
                      const active = i <= progressIndex;
                      return (
                        <div key={step} className="space-y-1">
                          <div className={`h-1.5 rounded-full ${active ? 'bg-nilink-accent' : 'bg-gray-200'}`} />
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${active ? 'text-gray-700' : 'text-gray-400'}`}>
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      Updated {formatIsoDate(deal.updatedAt)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {([
              ['needs_action', 'Needs Action'],
              ['awaiting_review', 'Awaiting Review'],
              ['in_progress', 'In Progress'],
            ] as const).map(([key, label]) =>
              groupedOpenDeals[key].length > 0 ? (
                <section key={key}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                    {label} ({groupedOpenDeals[key].length})
                  </h3>
                  <div className="space-y-4">
                    {groupedOpenDeals[key].map((deal) => {
                      const urgency = urgencyMetaForDeal(deal);
                      const ctaLabel = cardPrimaryCta(deal, urgency.level);
                      const stageMeta = cardStageMeta(deal);
                      const progressIndex = cardProgressIndex(deal);
                      return (
                        <motion.div
                          key={deal.id}
                          layout
                          className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md sm:p-6"
                          onClick={() => setSelectedId(deal.id)}
                          whileHover={{ y: -2 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        >
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Deal</p>
                              <h3 className="text-xl font-bold leading-tight text-nilink-ink sm:text-2xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                {athleteDealCardTitle(deal)}
                              </h3>
                              <p className="mt-1 text-xs font-medium text-gray-500">{athleteDealCardSubtitle(deal)}</p>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold text-gray-700">{stageMeta.label}:</span> {stageMeta.value}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${urgencyBadgeClass(urgency.level)}`}
                              >
                                {urgencyBadgeCopy(urgency.level)}
                              </span>
                              <div>
                              {yourTurn(deal) ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-nilink-accent/15 px-3 py-1 text-xs font-bold text-nilink-accent">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Your Turn
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-gray-400">
                                  Waiting on {nextOwnerLabel(deal.nextActionOwner)}
                                </span>
                              )}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">Next step: {deal.nextActionLabel}</p>
                          <div className="mt-3 grid grid-cols-4 gap-1.5">
                            {['Agreement', 'Execution', 'Review', 'Payout'].map((step, i) => {
                              const active = i <= progressIndex;
                              return (
                                <div key={step} className="space-y-1">
                                  <div className={`h-1.5 rounded-full ${active ? 'bg-nilink-accent' : 'bg-gray-200'}`} />
                                  <p
                                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                                      active ? 'text-gray-700' : 'text-gray-400'
                                    }`}
                                  >
                                    {step}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500">
                            <span className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              Updated {formatIsoDate(deal.updatedAt)}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                    setOpenIntent(ctaLabel === 'View feedback' ? 'feedback' : 'default');
                                  setSelectedId(deal.id);
                                }}
                                className="inline-flex items-center rounded-lg bg-nilink-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-nilink-accent-hover"
                              >
                                {ctaLabel}
                              </button>
                              <ChevronRight className="h-5 w-5 text-gray-300" />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              ) : null
            )}
            {groupedOpenDeals.needs_action.length === 0 &&
            groupedOpenDeals.awaiting_review.length === 0 &&
            groupedOpenDeals.in_progress.length === 0 ? (
              <p className="rounded-xl border border-gray-100 bg-white py-10 text-center text-sm text-gray-600">
                No in-progress deals.{' '}
                <button
                  type="button"
                  className="font-semibold text-nilink-accent underline decoration-nilink-accent/40 hover:text-nilink-accent-hover"
                  onClick={() => setTab('done')}
                >
                  View completed
                </button>
              </p>
            ) : null}
          </div>
        )}
      </div>

      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4 sm:p-8"
          onClick={() => setSelectedId(null)}
          role="dialog"
          aria-modal
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl cursor-auto overflow-auto rounded-2xl border border-gray-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading deal…
              </div>
            ) : detailError || !detail ? (
              <div className="space-y-4 p-8">
                <p className="text-sm text-red-600">{detailError || 'Deal not found'}</p>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-nilink-ink hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-gray-100 bg-nilink-sidebar px-6 py-5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Deal overview</p>
                  <p className="mt-1 text-lg font-semibold">Collaboration with this brand</p>
                  <p className="mt-1 text-xs text-white/85">
                    {campaignTitle ? `Campaign: ${campaignTitle}` : 'Direct collaboration'}
                  </p>
                  <p className="mt-1 text-xs text-white/85">
                    {stageProjection?.stageLabel ?? 'Deal'} · {stageProjection?.statusLine ?? detail.deal.nextActionLabel}
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
                    <section className="rounded-xl border border-gray-100 bg-nilink-page p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-nilink-ink">{stageProjection.stageLabel}</h3>
                          <p className="text-xs text-gray-600">{stageProjection.stageDescription}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                          {stageProjection.statusLine}
                        </span>
                      </div>
                      {stageProjection.isDisputed ? (
                        <p className="mt-2 text-xs font-semibold text-amber-700">This deal is currently in dispute.</p>
                      ) : null}
                      <div className="mt-3">
                        <ProgressTracker stageId={stageProjection.stageId} />
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Next Action</h3>
                    <p className="mt-2 text-sm font-semibold text-nilink-ink">
                      {stageProjection?.primaryAction?.label ?? 'Continue with current deal workflow'}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {stageProjection?.primaryAction?.enabled
                        ? 'Complete this step now to keep the deal moving.'
                        : stageProjection?.primaryAction?.reason ?? nextActionHint}
                    </p>
                    {detail.contract?.status === 'sent_for_signature' ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <label className="flex items-start gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={contractAgreementChecked}
                            onChange={(e) => setContractAgreementChecked(e.target.checked)}
                            className="mt-0.5"
                          />
                          I have reviewed this contract and agree to proceed with this deal.
                        </label>
                        <button
                          type="button"
                          disabled={pendingKey === 'sign' || !contractAgreementChecked}
                          onClick={() =>
                            void run('sign', async () => {
                              await patchContractStatus(detail.contract!.id, 'signed');
                            })
                          }
                          className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Sign contract
                        </button>
                      </div>
                    ) : null}
                    {stageProjection?.remaining.length ? (
                      <ul className="mt-3 space-y-1 text-xs text-gray-600">
                        {stageProjection.remaining.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>

                  {showDeliverablesSection ? (
                    <section
                      ref={deliverablesSectionRef}
                      className={`rounded-xl transition-all ${highlightFeedbackSection ? 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white' : ''}`}
                    >
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                        {stageId === 'review_revisions' ? 'Revisions & Feedback' : 'Deliverables'}
                      </h3>
                      <div className="space-y-4">
                        {detail.deliverables.map((del) => {
                          const subs = (submissionsByDeliverable[del.id] ?? []).slice().sort((a, b) => a.version - b.version);
                          const form = submitForms[del.id] ?? { tier: 'draft', url: '', body: '', notes: '' };
                          const projection = buildDeliverableProjection({
                            actor: 'athlete',
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
                            <div key={del.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-nilink-ink">{del.title}</p>
                                <p className="text-xs text-gray-500">
                                  Due {del.dueAt ? formatIsoDate(del.dueAt) : 'TBD'} · Revisions {del.revisionCountUsed}/{del.revisionLimit}
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
                                Brand feedback: {projection.feedback}
                              </p>
                            ) : null}

                            {subs.length > 1 ? (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-[11px] font-bold uppercase text-gray-500">
                                  View submission history ({subs.length})
                                </summary>
                                <ul className="mt-2 space-y-2">
                                  {subs.map((s) => (
                                    <li key={s.id} className="rounded-lg bg-gray-50 p-2 text-sm">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-semibold text-nilink-ink">
                                          v{s.version} · {submissionTierLabel(s.notes)}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatIsoDate(s.submittedAt)}</span>
                                      </div>
                                      {s.notes ? <p className="mt-1 text-xs text-gray-600">{s.notes}</p> : null}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : null}

                            {projection.primaryAction?.key === 'submit_work' ? (
                              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-3">
                                <p className="text-xs font-bold uppercase text-gray-500">{projection.primaryAction.label}</p>
                                <div className="mt-2 flex gap-3 text-sm">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`tier-${del.id}`}
                                      checked={form.tier === 'draft'}
                                      onChange={() =>
                                        setSubmitForms((prev) => ({
                                          ...prev,
                                          [del.id]: { ...form, tier: 'draft' },
                                        }))
                                      }
                                    />
                                    Draft
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`tier-${del.id}`}
                                      checked={form.tier === 'final'}
                                      onChange={() =>
                                        setSubmitForms((prev) => ({
                                          ...prev,
                                          [del.id]: { ...form, tier: 'final' },
                                        }))
                                      }
                                    />
                                    Final
                                  </label>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSubmitForms((prev) => ({
                                        ...prev,
                                        [del.id]: { ...form, notes: submitTemplates[form.tier] },
                                      }))
                                    }
                                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                                  >
                                    Use {form.tier === 'final' ? 'Final' : 'Draft'} Template
                                  </button>
                                  <p className="text-[11px] text-gray-500">
                                    {form.tier === 'final'
                                      ? 'Final submissions should include completed work context.'
                                      : 'Drafts can be rough cuts for early feedback.'}
                                  </p>
                                </div>
                                <input
                                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  placeholder="Link (optional)"
                                  value={form.url}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [del.id]: { ...form, url: e.target.value },
                                    }))
                                  }
                                />
                                <textarea
                                  className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${
                                    submitErrors[del.id] ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                                  }`}
                                  rows={3}
                                  placeholder={form.tier === 'final' ? 'Describe the final approved content...' : 'Describe what you are submitting...'}
                                  value={form.body}
                                  onChange={(e) =>
                                    setSubmitForms((prev) => ({
                                      ...prev,
                                      [del.id]: { ...form, body: e.target.value },
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
                                      [del.id]: { ...form, notes: e.target.value },
                                    }))
                                  }
                                />
                                {submitErrors[del.id] ? (
                                  <p className="mt-2 text-xs font-semibold text-red-700">{submitErrors[del.id]}</p>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={pendingKey === `sub-${del.id}`}
                                  onClick={() =>
                                    void run(`sub-${del.id}`, async () => {
                                      const bodyText = form.body.trim();
                                      const urlText = form.url.trim();
                                      if (!bodyText) {
                                        setSubmitErrors((prev) => ({
                                          ...prev,
                                          [del.id]: 'Add a short summary of what you are submitting.',
                                        }));
                                        return;
                                      }
                                      if (form.tier === 'final' && bodyText.length < 20 && !urlText) {
                                        setSubmitErrors((prev) => ({
                                          ...prev,
                                          [del.id]:
                                            'Final submission needs enough context (or attach a link) so the brand can approve quickly.',
                                        }));
                                        return;
                                      }
                                      setSubmitErrors((prev) => ({ ...prev, [del.id]: null }));
                                      const prefix = form.tier === 'draft' ? '[Draft] ' : '[Final] ';
                                      const notes = [prefix, form.notes].filter(Boolean).join(' ').trim();
                                      await createDeliverableSubmission(del.id, {
                                        body: bodyText,
                                        notes,
                                        artifacts: urlText ? [{ kind: 'url', ref: urlText }] : undefined,
                                      });
                                      setSubmitForms((prev) => ({
                                        ...prev,
                                        [del.id]: { tier: 'draft', url: '', body: '', notes: '' },
                                      }));
                                      setSubmitErrors((prev) => ({ ...prev, [del.id]: null }));
                                    })
                                  }
                                  className="mt-3 w-full rounded-xl bg-nilink-ink py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-gray-800 disabled:opacity-50"
                                >
                                  Send submission
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

                  {showPayoutSection && detail.payment ? (
                    <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Payout Status</h3>
                      <p className="mt-2 text-sm font-semibold text-emerald-900">
                        {detail.payment.currency} {detail.payment.amount.toLocaleString()} · {detail.payment.status.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-1 text-xs text-emerald-800/90">
                        {detail.payment.paidAt ? `Paid ${formatIsoDate(detail.payment.paidAt)}` : 'Payment will update once release conditions are met.'}
                      </p>
                    </section>
                  ) : null}

                  {showAdditionalDetails ? (
                    <details className="rounded-xl border border-gray-200 bg-nilink-page p-4">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-gray-500">
                        Additional Details
                      </summary>
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <p>Contract: {detail.contract ? contractStatusCopy(detail.contract.status) : 'No contract yet'}</p>
                        <p>
                          Payment:{' '}
                          {detail.payment
                            ? `${detail.payment.currency} ${detail.payment.amount.toLocaleString()}`
                            : 'No payment record yet'}
                        </p>
                        {parseTermsSnapshot(detail.deal.termsSnapshot)?.notes ? (
                          <p>Notes: {parseTermsSnapshot(detail.deal.termsSnapshot)!.notes}</p>
                        ) : null}
                      </div>
                    </details>
                  ) : null}

                  {showTimelineSection ? (
                    <details
                      className="rounded-xl border border-gray-100 bg-white p-4"
                      open={!timelineStartsCollapsed}
                    >
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-gray-500">
                        Timeline
                      </summary>
                      <ul className="mt-3 space-y-2">
                        {timelineRows.map((a) => (
                          <li key={a.id} className="text-sm text-gray-700">
                            <span className="font-semibold">{activitySummary(a)}</span>
                            <span className="ml-2 text-xs text-gray-400">{formatIsoDate(a.createdAt)}</span>
                          </li>
                        ))}
                        {timelineRows.length === 0 ? <li className="text-sm text-gray-400">No major updates yet.</li> : null}
                      </ul>
                    </details>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-nilink-ink hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
