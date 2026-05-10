'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight, Handshake, RefreshCw, Search } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import {
  businessSectionForDeal,
  fetchDealsList,
  formatIsoDate,
  parseTermsSnapshot,
  type ApiDeal,
  type BusinessDealSection,
} from '@/lib/deals/dashboardDealsClient';
import { dealStatusCopy } from '@/lib/deals/stageProjection';
import { useDealsRealtimeRefresh } from '@/lib/deals/useDealsRealtimeRefresh';

type BusinessFilter = '' | BusinessDealSection | 'payment';

const FILTERS: Array<{ value: BusinessFilter; label: string }> = [
  { value: '', label: 'All deals' },
  { value: 'needs_action', label: 'Needs action' },
  { value: 'awaiting_athlete', label: 'Waiting on athlete' },
  { value: 'awaiting_review', label: 'In review' },
  { value: 'payment', label: 'Payment' },
  { value: 'completed', label: 'Done' },
];

function DealStatusBadge({ status }: { status: string }) {
  const soft =
    status === 'paid' || status === 'closed'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'cancelled' || status === 'disputed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : status === 'under_review' || status === 'revision_requested'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${soft}`}>
      {dealStatusCopy(status)}
    </span>
  );
}

function nextOwnerLabel(owner: ApiDeal['nextActionOwner']): string {
  if (owner === 'brand') return 'You';
  if (owner === 'athlete') return 'Athlete';
  if (owner === 'system') return 'Payment';
  return 'Done';
}

function matchesFilter(deal: ApiDeal, filter: BusinessFilter): boolean {
  if (!filter) return true;
  if (filter === 'payment') {
    return deal.status === 'approved_completed' || deal.status === 'payment_pending' || deal.status === 'paid';
  }
  return businessSectionForDeal(deal) === filter;
}

export function BusinessDeals() {
  const router = useRouter();
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<BusinessFilter>('');

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      setDeals(await fetchDealsList());
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load deals');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useDealsRealtimeRefresh({ enabled: true, onInvalidate: loadList });

  const filteredDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deals.filter((deal) => {
      if (!matchesFilter(deal, filter)) return false;
      if (!q) return true;
      const terms = parseTermsSnapshot(deal.termsSnapshot);
      const hay = [
        deal.athleteName ?? '',
        deal.athleteSport ?? '',
        deal.athleteSchool ?? '',
        deal.campaignName ?? '',
        deal.status,
        deal.nextActionLabel,
        terms?.notes ?? '',
        terms?.compensationLine ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [deals, filter, searchQuery]);

  return (
    <div className="flex h-full min-h-full flex-col overflow-hidden bg-nilink-page font-sans text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white pb-4 pt-5">
        <DashboardPageHeader title="Deals" subtitle="Track contracts, deliverables, reviews, and payout" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search athlete, campaign, or next step"
              className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <label htmlFor="business-deal-filter" className="sr-only">
            Filter deals
          </label>
          <select
            id="business-deal-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as BusinessFilter)}
            className="min-w-[190px] rounded-full border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
          >
            {FILTERS.map((item) => (
              <option key={item.value || 'all'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadList()}
            disabled={listLoading}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-8 pt-4 dash-main-gutter-x">
        {listError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {listError}
          </div>
        ) : null}

        {listLoading ? (
          <div className="animate-pulse overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex gap-6 border-b border-gray-200 bg-gray-50/90 px-4 py-3">
              {[80, 72, 160, 56, 52].map((w, i) => (
                <div key={i} className="h-3 rounded bg-gray-200" style={{ width: w }} />
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
              {deals.length === 0 ? 'No deals in your pipeline yet' : 'No matches for this view'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
              {deals.length === 0
                ? 'When athletes accept offers, deals appear here with contract, review, and payout steps.'
                : 'Try another filter or search term.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/90 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  <th className="whitespace-nowrap px-4 py-3">Athlete</th>
                  <th className="whitespace-nowrap px-4 py-3">Stage</th>
                  <th className="min-w-[220px] px-4 py-3">Next step</th>
                  <th className="whitespace-nowrap px-4 py-3">Deal</th>
                  <th className="whitespace-nowrap px-4 py-3">Updated</th>
                  <th className="w-10 px-2 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => {
                  const athleteName = deal.athleteName?.trim() || 'Athlete';
                  const athleteMeta = [deal.athleteSport, deal.athleteSchool].filter(Boolean).join(' · ');
                  return (
                    <tr
                      key={deal.id}
                      className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50/80"
                      onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-semibold text-nilink-ink">{athleteName}</div>
                        {athleteMeta ? <div className="mt-0.5 text-xs text-gray-500">{athleteMeta}</div> : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <DealStatusBadge status={deal.status} />
                      </td>
                      <td className="max-w-md px-4 py-3 text-gray-700">
                        <span className="font-semibold text-nilink-accent">{nextOwnerLabel(deal.nextActionOwner)}:</span>{' '}
                        <span className="line-clamp-2">{deal.nextActionLabel || 'No further action'}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        {deal.campaignName ?? (deal.campaignId ? 'Campaign deal' : 'Direct deal')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatIsoDate(deal.updatedAt)}</td>
                      <td className="px-2 py-3 text-gray-300">
                        <ChevronRight className="h-4 w-4" aria-hidden />
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
  );
}
