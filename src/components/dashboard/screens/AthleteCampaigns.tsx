'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, ChevronRight, MessageSquare, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/authFetch';
import { apiCampaignToUi, type ApiApplicationRow, type ApiCampaignRow } from '@/lib/campaigns/clientMap';
import type { Campaign } from '@/components/dashboard/screens/campaignDashboardTypes';

export function AthleteCampaigns() {
  const { user } = useDashboard();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    campaign: Campaign;
    myApplication: ApiApplicationRow | null;
    applicationMessaging?: { canViewThread: boolean; canSend: boolean } | null;
  } | null>(null);
  const [applyPitch, setApplyPitch] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/campaigns');
      const data = (await res.json()) as { campaigns?: ApiCampaignRow[]; error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not load opportunities');
        setCampaigns([]);
        return;
      }
      setCampaigns((data.campaigns ?? []).map((c) => apiCampaignToUi(c, [])));
    } catch {
      setError('Network error');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openDetail = async (row: Campaign) => {
    setError(null);
    try {
      const res = await authFetch(`/api/campaigns/${row.id}`);
      const data = (await res.json()) as {
        campaign?: ApiCampaignRow;
        myApplication?: ApiApplicationRow | null;
        applicationMessaging?: { canViewThread: boolean; canSend: boolean } | null;
        error?: string;
      };
      if (!res.ok || !data.campaign) {
        setError(data.error || 'Could not open campaign');
        return;
      }
      setDetail({
        campaign: apiCampaignToUi(data.campaign, []),
        myApplication: data.myApplication ?? null,
        applicationMessaging: data.applicationMessaging ?? null,
      });
      setApplyPitch('');
    } catch {
      setError('Network error');
    }
  };

  const submitApply = async () => {
    if (!detail) return;
    setApplySubmitting(true);
    setError(null);
    try {
      const athleteSnapshot: Record<string, string> = {
        name: '',
        sport: '—',
        school: '—',
        image: '',
        followers: '—',
        engagement: '—',
      };
      athleteSnapshot.name = user?.name ?? '';

      const res = await authFetch(`/api/campaigns/${detail.campaign.id}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitch: applyPitch.trim(),
          athleteSnapshot,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        details?: { application?: ApiApplicationRow };
        application?: ApiApplicationRow;
      };
      if (!res.ok) {
        const existingApp = data.details?.application ?? data.application;
        if (res.status === 409 && existingApp) {
          const again = await authFetch(`/api/campaigns/${detail.campaign.id}`);
          const againJson = (await again.json()) as {
            campaign?: ApiCampaignRow;
            applicationMessaging?: { canViewThread: boolean; canSend: boolean } | null;
          };
          setDetail({
            ...detail,
            myApplication: existingApp,
            applicationMessaging: againJson.applicationMessaging ?? null,
          });
          await loadList();
          return;
        }
        setError(data.error || 'Could not apply');
        return;
      }
      if (data.application) {
        const again = await authFetch(`/api/campaigns/${detail.campaign.id}`);
        const againJson = (await again.json()) as {
          applicationMessaging?: { canViewThread: boolean; canSend: boolean } | null;
        };
        setDetail({
          ...detail,
          myApplication: data.application,
          applicationMessaging: againJson.applicationMessaging ?? {
            canViewThread: false,
            canSend: false,
          },
        });
      }
      await loadList();
    } catch {
      setError('Network error');
    } finally {
      setApplySubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 py-6">
        <DashboardPageHeader
          title="Campaigns"
          subtitle="Browse open brand campaigns and apply in one place"
          className="mb-2"
        />
        {error && (
          <p className="mt-2 text-sm text-amber-800">
            {error}{' '}
            <button type="button" className="font-semibold underline" onClick={() => void loadList()}>
              Retry
            </button>
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto pb-8 dash-main-gutter-x">
        {loading && <p className="py-12 text-center text-sm text-gray-400">Loading opportunities…</p>}
        {!loading && campaigns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
              <Megaphone className="h-7 w-7 text-gray-300" />
            </div>
            <p className="mb-1 font-bold text-gray-900">No open campaigns</p>
            <p className="max-w-md text-sm text-gray-400">
              When brands publish public campaigns that accept applications, they will show up here.
            </p>
          </div>
        )}
        {!loading && campaigns.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase text-gray-500">
              <tr>
                <th className="rounded-l-xl px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Goal</th>
                <th className="px-5 py-3">Window</th>
                <th className="rounded-r-xl px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50"
                  onClick={() => void openDetail(c)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400"
                        aria-hidden
                      >
                        <Megaphone className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-600">{c.goal}</td>
                  <td className="px-5 py-4 text-gray-500">
                    {c.startDate} – {c.endDate}
                  </td>
                  <td className="px-5 py-4">
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {detail && (
          <motion.div
            key="athlete-campaign-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <button
                type="button"
                className="absolute right-3 top-3 rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
                onClick={() => setDetail(null)}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="max-h-[90vh] overflow-auto p-6">
                <h2
                  className="text-2xl font-black uppercase tracking-wide text-nilink-ink"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {detail.campaign.name}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {detail.campaign.subtitle} · {detail.campaign.goal}
                </p>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold text-nilink-ink">Budget: </span>
                    {detail.campaign.budget || '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-nilink-ink">Dates: </span>
                    {detail.campaign.startDate} – {detail.campaign.endDate}
                  </p>
                  <p>
                    <span className="font-semibold text-nilink-ink">Sport focus: </span>
                    {detail.campaign.sport}
                  </p>
                </div>
                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Brief
                  </p>
                  <p className="text-sm leading-relaxed text-gray-700">{detail.campaign.brief}</p>
                </div>

                {detail.myApplication ? (
                  <div className="mt-6 rounded-xl border border-nilink-accent-border bg-nilink-accent-soft px-4 py-3 text-sm">
                    <p className="font-bold text-nilink-ink">You applied</p>
                    <p className="mt-1 text-gray-600">
                      Status: <span className="font-semibold capitalize">{detail.myApplication.status}</span>
                    </p>
                    {detail.myApplication.pitch ? (
                      <p className="mt-2 text-gray-600">&ldquo;{detail.myApplication.pitch}&rdquo;</p>
                    ) : null}
                    {detail.applicationMessaging?.canViewThread ? (
                      <Link
                        href={`/dashboard/messages?application=${encodeURIComponent(detail.myApplication.id)}`}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-nilink-accent-border bg-white py-2.5 text-sm font-bold text-nilink-ink transition-colors hover:bg-gray-50"
                        onClick={() => setDetail(null)}
                      >
                        <MessageSquare className="h-4 w-4" aria-hidden />
                        Open message thread
                      </Link>
                    ) : (
                      <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
                        Messaging opens when the brand approves your application, sends you an offer for this
                        campaign, or messages you here first.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-6">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Pitch (optional)
                    </label>
                    <textarea
                      value={applyPitch}
                      onChange={(e) => setApplyPitch(e.target.value)}
                      rows={4}
                      placeholder="Why you’re a great fit…"
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={applySubmitting}
                      onClick={() => void submitApply()}
                      className="mt-3 w-full rounded-lg bg-nilink-accent py-2.5 text-sm font-bold text-white hover:bg-nilink-accent-hover disabled:opacity-50"
                    >
                      {applySubmitting ? 'Submitting…' : 'Apply to campaign'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
