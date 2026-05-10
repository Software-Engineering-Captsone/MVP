'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronRight, Handshake, RefreshCw, Search } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import {
  fetchDealsList,
  formatIsoDate,
  humanizeDealStatus,
  parseTermsSnapshot,
  type ApiDeal,
} from '@/lib/deals/dashboardDealsClient';
import { DEAL_STATUSES } from '@/lib/campaigns/deals/types';
import {
  stageProgress,
  STAGE_ORDER,
} from '@/lib/deals/stageProjection';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

function nextOwnerLabel(owner: ApiDeal['nextActionOwner']): string {
  if (owner === 'brand') return 'Brand';
  if (owner === 'athlete') return 'Athlete';
  if (owner === 'system') return 'System';
  return '—';
}

function DealStatusBadge({ status }: { status: string }) {
  const soft =
    status === 'paid' || status === 'closed'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'cancelled' || status === 'disputed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : status === 'under_review' || status === 'submission_in_progress'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${soft}`}>
      {humanizeDealStatus(status)}
    </span>
  );
}

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
            <span className={`text-[11px] font-bold uppercase leading-tight tracking-wide ${current ? 'text-nilink-ink' : done ? 'text-emerald-700' : 'text-gray-500'}`}>
              {stageStepLabel(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function BusinessDeals() {
  const router = useRouter();
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  /** Empty string = all deal lifecycle statuses */
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const rows = await fetchDealsList();
      setDeals(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load deals');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filteredDeals = useMemo(() => {
    const byStatus = statusFilter.trim()
      ? deals.filter((d) => d.status === statusFilter.trim())
      : deals;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((d) => {
      const terms = parseTermsSnapshot(d.termsSnapshot);
      const hay = [
        d.athleteUserId,
        d.athleteName ?? '',
        d.athleteSport ?? '',
        d.athleteSchool ?? '',
        d.campaignName ?? '',
        d.id,
        d.status,
        d.nextActionLabel,
        terms?.offerOrigin ?? '',
        terms?.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [deals, searchQuery, statusFilter]);

  const refreshFromRealtime = useCallback(() => {
    void loadList();
  }, [loadList]);
  useDealsRealtimeRefresh({ enabled: true, dealId: null, onInvalidate: refreshFromRealtime });

  return (
    <div className="flex h-full min-h-full flex-col overflow-hidden bg-nilink-page font-sans text-nilink-ink">
        <div className="flex flex-1 flex-col overflow-hidden bg-nilink-page">
        <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white pb-4 pt-5">
          <DashboardPageHeader title="Deals" subtitle="Live pipeline, deliverables, reviews, and payout" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by athlete, status, notes..."
                className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
            <div className="flex min-w-[180px] flex-1 max-w-xs items-center gap-2">
              <label htmlFor="deal-status-filter" className="sr-only">
                Filter by deal status
              </label>
              <select
                id="deal-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All statuses</option>
                {DEAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanizeDealStatus(s).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void loadList()}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-8 pt-4 dash-main-gutter-x">
          {listError ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {listError}
            </div>
          ) : null}

          {listLoading ? (
            <div className="animate-pulse overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex gap-6 border-b border-gray-200 bg-gray-50/90 px-4 py-3">
                {[80, 72, 160, 56, 52].map((w, i) => (
                  <div key={i} className={`h-3 rounded bg-gray-200`} style={{ width: w }} />
                ))}
              </div>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-6 border-b border-gray-100 px-4 py-3">
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 rounded bg-gray-200" />
                    <div className="h-3 w-20 rounded bg-gray-200" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-gray-200" />
                  <div className="h-4 w-44 rounded bg-gray-200" />
                  <div className="ml-auto h-3 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-nilink-accent-soft text-nilink-accent">
                <Handshake className="h-7 w-7" aria-hidden />
              </div>
              <h2 className="mt-5 text-lg font-bold text-nilink-ink">
                {deals.length === 0 ? 'No deals in your pipeline yet' : 'No matches for this filter'}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                {deals.length === 0
                  ? 'When athletes accept your offers, deals appear here so you can upload contracts, review submissions, and track payout.'
                  : 'Try clearing the status filter or search to see all of your deals.'}
              </p>
              {deals.length === 0 ? (
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/dashboard/campaigns"
                    className="inline-flex rounded-xl bg-nilink-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-nilink-accent-hover"
                  >
                    Go to campaigns
                  </Link>
                  <Link
                    href="/dashboard/messages"
                    className="inline-flex rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    Open messages
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/90 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    <th className="whitespace-nowrap px-4 py-3">Athlete</th>
                    <th className="whitespace-nowrap px-4 py-3">Deal status</th>
                    <th className="min-w-[200px] px-4 py-3">Next step</th>
                    <th className="whitespace-nowrap px-4 py-3">Type</th>
                    <th className="whitespace-nowrap px-4 py-3">Updated</th>
                    <th className="w-10 px-2 py-3" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((d) => {
                    const athleteName = d.athleteName?.trim() || 'Athlete';
                    const athleteMeta = [d.athleteSport, d.athleteSchool].filter(Boolean).join(' · ');
                    return (
                      <tr
                        key={d.id}
                        className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50/80"
                        onClick={() => router.push('/dashboard/deals/' + d.id)}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-semibold text-nilink-ink">{athleteName}</div>
                          {athleteMeta ? <div className="mt-0.5 text-xs text-gray-500">{athleteMeta}</div> : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <DealStatusBadge status={d.status} />
                        </td>
                        <td className="max-w-md px-4 py-3 text-gray-700">
                          <span className="font-semibold text-nilink-accent">{nextOwnerLabel(d.nextActionOwner)}:</span>{' '}
                          <span className="line-clamp-2">{d.nextActionLabel || '—'}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                          {d.campaignName ?? (d.campaignId ? 'Campaign deal' : 'Direct deal')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatIsoDate(d.updatedAt)}</td>
                        <td className="px-2 py-3 text-gray-300">
                          <ChevronRight className="h-4 w-4" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
