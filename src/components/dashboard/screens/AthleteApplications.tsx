'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, FileEdit, Loader2, XCircle } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { authFetch } from '@/lib/authFetch';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';

type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'offer_sent'
  | 'offer_declined'
  | 'rejected'
  | 'withdrawn';

type ApplicationWithCampaign = {
  application: {
    id: string;
    campaignId: string;
    status: string;
    pitch?: string;
    withdrawnByAthlete?: boolean;
    createdAt?: string;
  };
  campaign: {
    id: string;
    name: string;
    image?: string;
    brandDisplayName?: string;
  } | null;
};

const PLACEHOLDER_IMAGE = '/brands_images/brand-01.svg';
const PIPELINE_STEPS = ['Applied', 'Review', 'Shortlist', 'Offer'] as const;

function normalizeStatus(row: ApplicationWithCampaign['application']): ApplicationStatus {
  const status = String(row.status ?? '');
  if (status === 'rejected' && row.withdrawnByAthlete === true) return 'withdrawn';
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

export function AthleteApplications() {
  const [applications, setApplications] = useState<ApplicationWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editAppId, setEditAppId] = useState<string | null>(null);
  const [editPitch, setEditPitch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/applications');
      const data = (await res.json()) as {
        applications?: ApplicationWithCampaign[];
        error?: string;
      };
      if (!res.ok) {
        setApplications([]);
        setError(data.error || 'Could not load applications');
      } else {
        setApplications(Array.isArray(data.applications) ? data.applications : []);
      }
    } catch {
      setApplications([]);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sorted = useMemo(() => {
    return [...applications].sort((a, b) => {
      const ta = new Date(a.application.createdAt ?? 0).getTime();
      const tb = new Date(b.application.createdAt ?? 0).getTime();
      return tb - ta;
    });
  }, [applications]);

  const submitEdit = useCallback(async () => {
    if (!editAppId) return;
    const res = await authFetch(`/api/applications/${editAppId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'edit', pitch: editPitch }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || 'Could not update application');
      return;
    }
    setEditAppId(null);
    setEditPitch('');
    await loadData();
  }, [editAppId, editPitch, loadData]);

  const withdraw = useCallback(async (applicationId: string) => {
    const ok = window.confirm('Withdraw this application?');
    if (!ok) return;
    const res = await authFetch(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'withdraw' }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || 'Could not withdraw application');
      return;
    }
    await loadData();
  }, [loadData]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-4 pt-5">
        <DashboardPageHeader
          title="Applications"
          subtitle="Track every submission in one compact pipeline view."
        />
      </div>

      <div className="dash-main-gutter-x min-h-0 flex-1 overflow-auto py-6">
        {error ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading applications...
          </div>
        ) : null}

        {!loading ? (
          sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
              You have not applied to any campaigns yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {sorted.map((row) => {
                const status = normalizeStatus(row.application);
                const canEdit = status === 'applied';
                const canWithdraw = status === 'applied';
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
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusClass(status)}`}>
                            {statusLabel(status)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                          <Calendar className="h-3.5 w-3.5" />
                          Applied {formatDate(row.application.createdAt)}
                        </div>

                        <div className="mt-2">
                          <div className="flex gap-1">
                            {PIPELINE_STEPS.map((step, i) => (
                              <div
                                key={step}
                                className={`h-1.5 flex-1 rounded-full ${
                                  active != null && i <= active ? 'bg-nilink-accent' : 'bg-gray-100'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">Applied → Review → Shortlist → Offer</p>
                        </div>

                        {(canEdit || canWithdraw) ? (
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Edit application</h3>
            <p className="mt-1 text-sm text-gray-500">You can edit your application before review starts.</p>
            <textarea
              value={editPitch}
              onChange={(e) => setEditPitch(e.target.value)}
              rows={4}
              className="mt-4 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                onClick={() => {
                  setEditAppId(null);
                  setEditPitch('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-nilink-accent px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void submitEdit()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
