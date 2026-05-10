'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, Handshake, RefreshCw, Sparkles } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import {
  compensationAmountFromDealSnapshot,
  fetchDealsList,
  formatIsoDate,
  parseTermsSnapshot,
  type ApiDeal,
} from '@/lib/deals/dashboardDealsClient';
import { dealStatusCopy } from '@/lib/deals/stageProjection';
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
  if (level === 'needs_signature') return 'Needs signature';
  if (level === 'in_review') return 'Brand reviewing';
  return 'On track';
}

function urgencyBadgeClass(level: UrgencyLevel): string {
  if (level === 'overdue') return 'bg-red-100 text-red-700';
  if (level === 'due_soon') return 'bg-amber-100 text-amber-700';
  if (level === 'needs_signature') return 'bg-indigo-100 text-indigo-700';
  if (level === 'in_review') return 'bg-blue-100 text-blue-700';
  return 'bg-emerald-100 text-emerald-700';
}

function isDoneDeal(deal: ApiDeal): boolean {
  return deal.status === 'paid' || deal.status === 'closed' || deal.status === 'cancelled';
}

function nextOwnerLabel(owner: ApiDeal['nextActionOwner']): string {
  if (owner === 'brand') return 'brand';
  if (owner === 'athlete') return 'you';
  if (owner === 'system') return 'payment';
  return 'done';
}

function athleteDealCardTitle(deal: ApiDeal): string {
  const terms = parseTermsSnapshot(deal.termsSnapshot);
  const line = (terms?.compensationLine ?? '').trim();
  if (line) return line;
  const notes = (terms?.notes ?? '').trim();
  if (notes) return notes.length > 56 ? `${notes.slice(0, 56)}...` : notes;
  return 'NIL partnership';
}

function athleteDealCardSubtitle(deal: ApiDeal): string {
  const brand = deal.brandName?.trim() || 'Brand';
  const campaign = deal.campaignName?.trim();
  return campaign ? `${brand} · ${campaign}` : brand;
}

function urgencyMetaForDeal(deal: ApiDeal): { level: UrgencyLevel; nearestDueAt: string | null } {
  const terms = parseTermsSnapshot(deal.termsSnapshot);
  const dueAts = (terms?.frozenDeliverables ?? [])
    .map((deliverable) => deliverable.dueAt)
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
  if (label.includes('sign') || label.includes('contract')) return { level: 'needs_signature', nearestDueAt };
  if (deal.status === 'under_review' || label.includes('review')) return { level: 'in_review', nearestDueAt };
  return { level: 'on_track', nearestDueAt };
}

function cardPrimaryCta(deal: ApiDeal, urgency: UrgencyLevel): string {
  if (urgency === 'needs_signature') return 'Sign contract';
  if (urgency === 'overdue' || urgency === 'due_soon') return 'Submit deliverable';
  if (urgency === 'in_review') return 'View feedback';
  if (deal.nextActionOwner === 'athlete') return 'Take action';
  if (deal.status === 'paid' || deal.status === 'closed') return 'View payout';
  return 'Open deal';
}

function cardStageMeta(deal: ApiDeal): { label: string; value: string } {
  const terms = parseTermsSnapshot(deal.termsSnapshot);
  const label = (deal.nextActionLabel || '').toLowerCase();
  if (label.includes('sign') || label.includes('contract')) return { label: 'Stage', value: 'Agreement' };
  if (deal.status === 'under_review' || deal.status === 'revision_requested' || label.includes('review')) {
    return { label: 'Stage', value: 'Review' };
  }
  if (deal.status === 'approved_completed' || deal.status === 'payment_pending') return { label: 'Stage', value: 'Payout' };
  if (deal.status === 'paid' || deal.status === 'closed') return { label: 'Stage', value: 'Done' };
  return { label: 'Compensation', value: terms?.compensationLine ?? 'Sponsorship deal' };
}

function cardProgressIndex(deal: ApiDeal): number {
  const label = (deal.nextActionLabel || '').toLowerCase();
  if (deal.status === 'created' || deal.status === 'contract_pending' || label.includes('sign')) return 0;
  if (deal.status === 'under_review' || deal.status === 'revision_requested' || label.includes('review')) return 2;
  if (deal.status === 'approved_completed' || deal.status === 'payment_pending' || deal.status === 'paid' || deal.status === 'closed') {
    return 3;
  }
  return 1;
}

export function DealManagement() {
  const router = useRouter();
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ListTab>('open');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDeals(await fetchDealsList());
    } catch (e) {
      setDeals([]);
      setError(e instanceof Error ? e.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useDealsRealtimeRefresh({ enabled: true, onInvalidate: loadList });

  const filteredDeals = useMemo(() => deals.filter((deal) => (tab === 'done' ? isDoneDeal(deal) : !isDoneDeal(deal))), [deals, tab]);

  const sectionForDeal = useCallback((deal: ApiDeal): AthleteDealSection => {
    if (isDoneDeal(deal)) return 'completed';
    if (deal.nextActionOwner === 'athlete') return 'needs_action';
    if (deal.status === 'under_review' || deal.nextActionLabel.toLowerCase().includes('review')) return 'awaiting_review';
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
      if (section !== 'completed') out[section].push(deal);
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
      open: deals.filter((deal) => !isDoneDeal(deal)).length,
      done: deals.filter((deal) => isDoneDeal(deal)).length,
    }),
    [deals],
  );

  const totalEarnings = useMemo(
    () => deals.reduce((sum, deal) => sum + compensationAmountFromDealSnapshot(deal.termsSnapshot), 0),
    [deals],
  );

  const openDeal = (dealId: string) => router.push(`/dashboard/deals/${dealId}`);

  const renderDealCard = (deal: ApiDeal) => {
    const urgency = urgencyMetaForDeal(deal);
    const ctaLabel = cardPrimaryCta(deal, urgency.level);
    const stageMeta = cardStageMeta(deal);
    const progressIndex = cardProgressIndex(deal);
    return (
      <article
        key={deal.id}
        className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md sm:p-6"
        onClick={() => openDeal(deal.id)}
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
            <span className={`mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${urgencyBadgeClass(urgency.level)}`}>
              {urgencyBadgeCopy(urgency.level)}
            </span>
            <div>
              {deal.nextActionOwner === 'athlete' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-nilink-accent/15 px-3 py-1 text-xs font-bold text-nilink-accent">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Your turn
                </span>
              ) : (
                <span className="text-xs font-semibold text-gray-400">Waiting on {nextOwnerLabel(deal.nextActionOwner)}</span>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600">Next step: {deal.nextActionLabel || dealStatusCopy(deal.status)}</p>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {['Agreement', 'Work', 'Review', 'Payout'].map((step, i) => {
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" aria-hidden />
            Updated {formatIsoDate(deal.updatedAt)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDeal(deal.id);
            }}
            className="inline-flex items-center rounded-lg bg-nilink-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-nilink-accent-hover"
          >
            {ctaLabel}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="flex h-full min-h-full flex-col bg-nilink-page font-sans text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white py-8">
        <DashboardPageHeader title="Deals" subtitle="Agreed terms, submissions, and payouts" className="mb-6" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-nilink-sidebar p-6 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Agreed value</p>
            <p className="mt-2 text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              ${totalEarnings.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-400">From accepted offer terms</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Open deals</p>
            <p className="mt-2 text-4xl font-black text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {tabCounts.open}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Done</p>
            <p className="mt-2 text-4xl font-black text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {tabCounts.done}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-8 pt-5 dash-main-gutter-x">
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
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
              {(['open', 'done'] as const).map((value) => {
                const selected = tab === value;
                const label = value === 'open' ? 'In progress' : 'Done';
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setTab(value)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition sm:text-[13px] ${
                      selected
                        ? 'border-gray-400 bg-gray-100 text-gray-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label} <span className={selected ? 'text-gray-500' : 'text-gray-400'}>({tabCounts[value]})</span>
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
          <div className="animate-pulse space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-4 w-48 rounded bg-gray-200" />
                    <div className="h-3 w-32 rounded bg-gray-200" />
                  </div>
                  <div className="h-6 w-20 shrink-0 rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
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
              <Link href="/dashboard/offers" className="inline-flex rounded-xl bg-nilink-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-nilink-accent-hover">
                View offers
              </Link>
              <Link href="/dashboard/campaigns" className="inline-flex rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">
                Browse campaigns
              </Link>
            </div>
          </div>
        ) : tab === 'done' ? (
          <div className="space-y-4">
            {filteredDeals.length === 0 ? (
              <p className="rounded-xl border border-gray-100 bg-white py-10 text-center text-sm text-gray-500">
                No done deals yet. Switch to <span className="font-semibold">In progress</span> for active work.
              </p>
            ) : null}
            {filteredDeals.map(renderDealCard)}
          </div>
        ) : (
          <div className="space-y-6">
            {([
              ['needs_action', 'Needs action'],
              ['awaiting_review', 'Awaiting review'],
              ['in_progress', 'In progress'],
            ] as const).map(([key, label]) =>
              groupedOpenDeals[key].length > 0 ? (
                <section key={key}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                    {label} ({groupedOpenDeals[key].length})
                  </h3>
                  <div className="space-y-4">{groupedOpenDeals[key].map(renderDealCard)}</div>
                </section>
              ) : null,
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
                  View done
                </button>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
