'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { authFetch } from '@/lib/authFetch';

type AthleteOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

type ApiOfferRow = {
  id: string;
  offerOrigin: 'campaign_handoff' | 'direct_profile' | 'chat_negotiated';
  campaignId: string | null;
  applicationId: string | null;
  athleteUserId: string;
  brandUserId: string;
  status: string;
  dealId?: string;
  notes?: string;
  structuredDraft?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  declineNote?: string;
  athleteOfferStatus: AthleteOfferStatus;
  brandName: string;
  campaignName: string | null;
  shortDescription: string;
  compensationSummary: string;
  deadline: string | null;
};

type OfferDetailPayload = {
  offer: ApiOfferRow;
  athleteView?: {
    title?: string;
    shortDescription?: string;
    fullDescription?: string;
    campaignName?: string | null;
    campaignContext?: string;
    timeline?: { deadline?: string | null };
    expectations?: {
      brandApprovalRequired?: boolean;
      revisionRounds?: number | null;
    };
    deliverables?: Array<{ title: string; quantity?: number; platforms?: string[] }>;
    compensation?: { summary?: string; amount?: string | null };
    contractPreview?: {
      status: string;
      fileUrl: string | null;
      signedAt: string | null;
    } | null;
    createdAt?: string | null;
  };
  readOnlyContext?: {
    campaignName?: string;
    campaignBrief?: string;
  };
};

const declineReasonOptions = [
  { id: 'not_interested', label: 'Not interested' },
  { id: 'timing_conflict', label: 'Timing conflict' },
  { id: 'compensation_too_low', label: 'Compensation too low' },
  { id: 'does_not_fit_brand', label: "Doesn't fit my brand" },
  { id: 'other', label: 'Other' },
] as const;

function statusBadge(status: AthleteOfferStatus): string {
  if (status === 'accepted') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'declined') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'expired') return 'border-gray-200 bg-gray-100 text-gray-600';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AthleteOffers({ initialOfferId = null }: { initialOfferId?: string | null }) {
  const router = useRouter();
  const [offers, setOffers] = useState<ApiOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(initialOfferId);
  const [detail, setDetail] = useState<OfferDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState<(typeof declineReasonOptions)[number]['id']>('not_interested');
  const [declineNote, setDeclineNote] = useState('');

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/offers');
      const data = (await res.json()) as { offers?: ApiOfferRow[]; error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not load offers');
        setOffers([]);
        return;
      }
      const rows = Array.isArray(data.offers) ? data.offers : [];
      setOffers(rows);
      if (!selectedOfferId && rows.length > 0) {
        const preferred = initialOfferId ? rows.find((r) => r.id === initialOfferId) : null;
        setSelectedOfferId((preferred ?? rows[0]).id);
      }
    } catch {
      setError('Network error while loading offers');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [initialOfferId, selectedOfferId]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    if (!selectedOfferId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    void (async () => {
      try {
        const res = await authFetch(`/api/offers/${selectedOfferId}`);
        const data = (await res.json()) as OfferDetailPayload & { error?: string };
        if (cancelled) return;
        if (!res.ok || !data.offer) {
          setError(data.error || 'Could not load offer details');
          return;
        }
        setDetail(data);
      } catch {
        if (!cancelled) setError('Network error while loading offer details');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOfferId]);

  const grouped = useMemo(() => {
    const out: Record<AthleteOfferStatus, ApiOfferRow[]> = {
      pending: [],
      accepted: [],
      declined: [],
      expired: [],
    };
    for (const o of offers) {
      out[o.athleteOfferStatus].push(o);
    }
    return out;
  }, [offers]);

  const activeOfferStatus = detail?.offer.athleteOfferStatus ?? 'pending';

  const onAccept = async () => {
    if (!detail) return;
    setActionLoading('accept');
    setNotice(null);
    try {
      const res = await authFetch(`/api/offers/${detail.offer.id}/accept`, { method: 'POST' });
      const data = (await res.json()) as { error?: string; deal?: { id: string } };
      if (!res.ok) {
        setNotice(data.error || 'Could not accept offer');
        return;
      }
      await loadOffers();
      if (data.deal?.id) {
        router.push(`/dashboard/deals?deal=${encodeURIComponent(data.deal.id)}`);
      } else {
        setNotice('Offer accepted. Your deal is now in Deals.');
        router.push('/dashboard/deals');
      }
    } catch {
      setNotice('Network error while accepting offer');
    } finally {
      setActionLoading(null);
    }
  };

  const onDecline = async () => {
    if (!detail) return;
    setActionLoading('decline');
    setNotice(null);
    try {
      const res = await authFetch(`/api/offers/${detail.offer.id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          declineReason,
          declineNote: declineReason === 'other' ? declineNote.trim() : declineNote.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNotice(data.error || 'Could not decline offer');
        return;
      }
      setShowDeclineModal(false);
      setDeclineNote('');
      await loadOffers();
      setNotice('Offer declined. The brand has been notified.');
    } catch {
      setNotice('Network error while declining offer');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex h-full min-h-full flex-col bg-nilink-page text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white py-8">
        <DashboardPageHeader
          title="Pending Offers"
          subtitle="Review incoming offers, make decisions, and move accepted opportunities into Deals."
          className="mb-4"
        />
        {notice ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{notice}</p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm text-red-700">
            {error}{' '}
            <button type="button" className="font-semibold underline" onClick={() => void loadOffers()}>
              Retry
            </button>
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4 dash-main-gutter-x">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
            Offers ({offers.length})
          </div>
          <div className="scrollbar-hide h-full overflow-y-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading offers...
              </div>
            ) : offers.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No offers yet.</div>
            ) : (
              (['pending', 'accepted', 'declined', 'expired'] as const).map((group) =>
                grouped[group].length ? (
                  <div key={group}>
                    <p className="px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {group.replace('_', ' ')} ({grouped[group].length})
                    </p>
                    {grouped[group].map((offer) => (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => setSelectedOfferId(offer.id)}
                        className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                          selectedOfferId === offer.id ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">{offer.brandName}</p>
                            <p className="truncate text-xs text-gray-500">{offer.campaignName ?? 'Direct offer'}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(offer.athleteOfferStatus)}`}>
                            {offer.athleteOfferStatus}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{offer.shortDescription || 'No description provided.'}</p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                          <span>{offer.compensationSummary}</span>
                          <span>{fmtDate(offer.createdAt)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null
              )
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white">
          {!selectedOfferId ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Select an offer to review details.
            </div>
          ) : detailLoading || !detail ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading offer details...
            </div>
          ) : (
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Offer</p>
                  <h2 className="text-2xl font-black text-nilink-ink">
                    {detail.athleteView?.title || detail.athleteView?.campaignName || 'Partnership Offer'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {detail.athleteView?.campaignName || detail.readOnlyContext?.campaignName || 'Direct offer'}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusBadge(activeOfferStatus)}`}>
                  {activeOfferStatus}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Compensation</p>
                  <p className="mt-2 text-sm text-gray-800">
                    {detail.athleteView?.compensation?.summary || detail.offer.compensationSummary}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Deadline</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {fmtDate(detail.athleteView?.timeline?.deadline || detail.offer.deadline)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Created</p>
                  <p className="mt-2 text-sm text-gray-800">{fmtDate(detail.offer.createdAt)}</p>
                </div>
              </div>

              <section className="mt-6 rounded-xl border border-gray-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {detail.athleteView?.fullDescription || detail.offer.notes || 'No description provided.'}
                </p>
              </section>

              <section className="mt-4 rounded-xl border border-gray-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Campaign Context</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {detail.athleteView?.campaignContext || detail.readOnlyContext?.campaignBrief || 'No campaign context provided.'}
                </p>
              </section>

              <section className="mt-4 rounded-xl border border-gray-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Deliverables (High Level)</h3>
                {detail.athleteView?.deliverables && detail.athleteView.deliverables.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {detail.athleteView.deliverables.map((d, idx) => (
                      <li key={`${d.title}-${idx}`}>
                        {d.title}
                        {typeof d.quantity === 'number' ? ` - ${d.quantity} assets` : ''}
                        {Array.isArray(d.platforms) && d.platforms.length > 0 ? ` (${d.platforms.join(', ')})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-600">Detailed deliverables are finalized after acceptance in Deals.</p>
                )}
              </section>

              <section className="mt-4 rounded-xl border border-gray-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Contract Preview</h3>
                {detail.athleteView?.contractPreview ? (
                  <div className="mt-2 text-sm text-gray-700">
                    <p>Status: {detail.athleteView.contractPreview.status}</p>
                    {detail.athleteView.contractPreview.fileUrl ? (
                      <a
                        href={detail.athleteView.contractPreview.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 font-semibold text-nilink-accent hover:underline"
                      >
                        View contract <ChevronRight className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-600">Contract will appear in Deals after acceptance when required.</p>
                )}
              </section>

              {activeOfferStatus === 'pending' ? (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={() => void onAccept()}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {actionLoading === 'accept' ? 'Accepting...' : 'Accept Offer'}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={() => setShowDeclineModal(true)}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    Decline Offer
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showDeclineModal && detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Decline offer</h3>
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-gray-600">
              Share a reason to help the brand understand your decision.
            </p>
            <div className="space-y-2">
              {declineReasonOptions.map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={declineReason === option.id}
                    onChange={() => setDeclineReason(option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <textarea
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              rows={3}
              placeholder="Optional note"
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={() => void onDecline()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading === 'decline' ? 'Declining...' : 'Confirm decline'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

