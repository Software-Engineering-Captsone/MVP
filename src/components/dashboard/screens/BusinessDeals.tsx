'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import {
  fetchDealsList,
  formatIsoDate,
  formatShortId,
  humanizeDealStatus,
  parseTermsSnapshot,
  type ApiDeal,
} from '@/lib/deals/dashboardDealsClient';
import { DEAL_STATUSES } from '@/lib/campaigns/deals/types';

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

  return (
    <div className="h-full flex flex-col bg-nilink-surface overflow-hidden text-nilink-ink">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-4 pt-5">
          <DashboardPageHeader title="Deals" subtitle="Live pipeline, deliverables, and reviews" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by athlete, status, notes..."
                className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
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
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-nilink-accent/30"
              >
                <option value="">All statuses</option>
                {DEAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanizeDealStatus(s)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void loadList()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/40"
            >
              <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-6 dash-main-gutter-x">
          {listError ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {listError}
            </div>
          ) : null}

          {listLoading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading deals…
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white/80 py-12 text-center text-sm text-gray-500">
              {deals.length === 0
                ? 'No deals yet.'
                : 'No deals match the current status filter and search.'}
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase text-gray-500">
                <tr>
                  <th className="whitespace-nowrap rounded-l-xl px-5 py-3">Athlete</th>
                  <th className="whitespace-nowrap px-5 py-3">Deal status</th>
                  <th className="min-w-[200px] px-5 py-3">Next step</th>
                  <th className="whitespace-nowrap px-5 py-3">Type</th>
                  <th className="whitespace-nowrap px-5 py-3">Updated</th>
                  <th className="w-10 rounded-r-xl px-5 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((d) => (
                  <tr
                    key={d.id}
                    className="group cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50"
                    onClick={() => router.push(`/dashboard/deals/${d.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/deals/${d.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open deal workspace for athlete ${formatShortId(d.athleteUserId)}`}
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-nilink-ink">
                      {formatShortId(d.athleteUserId)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <DealStatusBadge status={d.status} />
                    </td>
                    <td className="max-w-md px-5 py-4 text-gray-700">
                      <span className="font-semibold text-nilink-accent">{nextOwnerLabel(d.nextActionOwner)}:</span>{' '}
                      <span className="line-clamp-2">{d.nextActionLabel || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                      {d.campaignId ? 'Campaign deal' : 'Direct deal'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">{formatIsoDate(d.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
