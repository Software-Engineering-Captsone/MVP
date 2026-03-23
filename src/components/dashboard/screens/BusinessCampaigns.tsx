'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Eye, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { CreateCampaignOverlay, type CreateCampaignPayload } from './CreateCampaignOverlay';
import { CampaignDetail } from './CampaignDetail';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { authFetch } from '@/lib/authFetch';
import { apiCampaignToUi, type ApiApplicationRow, type ApiCampaignRow } from '@/lib/campaigns/clientMap';
import type { Campaign, CampaignStatus, ContractedAthlete } from '@/components/dashboard/screens/campaignDashboardTypes';

export type {
  ActivityItem,
  Campaign,
  CampaignStatus,
  Candidate,
  CandidateStatus,
  ContractedAthlete,
  Deliverable,
} from '@/components/dashboard/screens/campaignDashboardTypes';

/* ── Status Badge ───────────────────────────────────────────── */
const statusStyles: Record<CampaignStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-500 border-gray-200',
  'Ready to Launch': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Open for Applications': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Reviewing Candidates': 'bg-amber-50 text-amber-700 border-amber-200',
  'Deal Creation in Progress': 'bg-gray-100 text-nilink-ink border-gray-300',
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Completed': 'bg-gray-100 text-gray-600 border-gray-300',
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

/* ── Avatar Group ───────────────────────────────────────────── */
function AvatarGroup({ athletes, count }: { athletes: ContractedAthlete[]; count: number }) {
  const shown = athletes.slice(0, 3);
  const remaining = count - shown.length;

  if (count === 0) {
    return <span className="text-xs text-gray-400 font-medium">—</span>;
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((a) => (
          <img
            key={a.id}
            src={a.image}
            alt={a.name}
            className="w-7 h-7 rounded-full border-2 border-white object-cover"
          />
        ))}
      </div>
      {remaining > 0 && (
        <span className="ml-1.5 text-xs font-bold text-gray-400">+{remaining}</span>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export function BusinessCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [brandDisplayName, setBrandDisplayName] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadCampaignList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await authFetch('/api/campaigns');
      const data = (await res.json()) as { campaigns?: ApiCampaignRow[]; error?: string };
      if (!res.ok) {
        setListError(data.error || 'Could not load campaigns');
        setCampaigns([]);
        return;
      }
      const rows = data.campaigns ?? [];
      setCampaigns(rows.map((c) => apiCampaignToUi(c, [])));
    } catch {
      setListError('Network error');
      setCampaigns([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaignList();
  }, [loadCampaignList]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (!res.ok) return;
        const data = (await res.json()) as { user?: { name?: string } };
        if (data.user?.name) setBrandDisplayName(data.user.name);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const openCampaignDetail = useCallback(
    async (row: Campaign) => {
      try {
        const res = await authFetch(`/api/campaigns/${row.id}`);
        const data = (await res.json()) as {
          campaign?: ApiCampaignRow;
          applications?: ApiApplicationRow[];
          error?: string;
        };
        if (!res.ok || !data.campaign) {
          setListError(data.error || 'Could not load campaign');
          return;
        }
        setSelectedCampaign(
          apiCampaignToUi(data.campaign, data.applications ?? [])
        );
      } catch {
        setListError('Network error');
      }
    },
    []
  );

  const refreshSelectedCampaign = useCallback(async () => {
    if (!selectedCampaign) return;
    await openCampaignDetail(selectedCampaign);
  }, [openCampaignDetail, selectedCampaign]);

  const handleLaunchCampaign = async (payload: CreateCampaignPayload) => {
    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          brandDisplayName: brandDisplayName || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setListError(data.error || 'Could not create campaign');
        return;
      }
      setShowCreateOverlay(false);
      await loadCampaignList();
    } catch {
      setListError('Network error');
    }
  };

  const handlePatchApplication = async (
    applicationId: string,
    status: 'shortlisted' | 'approved' | 'declined'
  ) => {
    const res = await authFetch(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setListError(data.error || 'Update failed');
      return;
    }
    await refreshSelectedCampaign();
    await loadCampaignList();
  };

  // Stats
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');
  const openCampaigns = campaigns.filter((c) => c.status === 'Open for Applications');
  const reviewingCampaigns = campaigns.filter(
    (c) => c.status === 'Reviewing Candidates' || c.status === 'Deal Creation in Progress'
  );
  const completedCampaigns = campaigns.filter((c) => c.status === 'Completed');

  // Filters
  const filteredCampaigns = campaigns.filter((c) => {
    if (activeFilter === 'Active' && c.status !== 'Active') return false;
    if (activeFilter === 'Completed' && c.status !== 'Completed') return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* ── Campaigns Home (list view) ── */}
      {!selectedCampaign && (
        <div className="h-full flex flex-col bg-white overflow-hidden text-nilink-ink">
        {/* ── Title + Stats ── */}
        <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 py-6">
          <DashboardPageHeader
            title="Campaigns"
            subtitle="Create, manage, and track NIL campaigns (saved to server file data/local-campaign-store.json)"
            className="mb-6"
          />

          {listError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {listError}
              <button
                type="button"
                className="ml-3 font-semibold underline"
                onClick={() => {
                  setListError(null);
                  void loadCampaignList();
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Stats — light tint matched to value color */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Active',
                value: activeCampaigns.length,
                valueClass: 'text-emerald-700',
                cardClass: 'border-emerald-200/80 bg-emerald-50/90',
                labelClass: 'text-emerald-700/70',
              },
              {
                label: 'Open for Apps',
                value: openCampaigns.length,
                valueClass: 'text-nilink-accent',
                cardClass: 'border-nilink-accent-border bg-nilink-accent-soft',
                labelClass: 'text-nilink-accent/80',
              },
              {
                label: 'Reviewing',
                value: reviewingCampaigns.length,
                valueClass: 'text-amber-700',
                cardClass: 'border-amber-200/80 bg-amber-50/90',
                labelClass: 'text-amber-800/70',
              },
              {
                label: 'Completed',
                value: completedCampaigns.length,
                valueClass: 'text-gray-600',
                cardClass: 'border-gray-200 bg-gray-100/80',
                labelClass: 'text-gray-500',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border p-5 shadow-sm ${stat.cardClass}`}
              >
                <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${stat.labelClass}`}>
                  {stat.label}
                </p>
                <p className={`text-3xl font-black ${stat.valueClass}`}>
                  {String(stat.value).padStart(2, '0')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Search + filter chips + primary CTA ── */}
        <div className="dash-main-gutter-x flex shrink-0 flex-col gap-3 border-b border-gray-100 py-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 sm:max-w-xs sm:flex-1 sm:flex-none md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {(['All', 'Active', 'Completed'] as const).map((tab) => {
              const on = activeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors sm:text-[13px] ${
                    on
                      ? 'border-gray-400 bg-gray-100 text-gray-900'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="hidden flex-1 sm:block" aria-hidden />

          <button
            type="button"
            onClick={() => setShowCreateOverlay(true)}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-nilink-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-nilink-accent-hover sm:ml-auto sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </button>
        </div>

        {/* ── Campaign Table ── */}
        <div className="flex-1 overflow-auto pb-6 dash-main-gutter-x">
          {!listLoading && (
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-bold text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 rounded-l-xl">Name</th>
                <th className="px-5 py-3">Goal</th>
                <th className="px-5 py-3">Athletes</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 rounded-r-xl w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  onClick={() => void openCampaignDetail(campaign)}
                  className="group hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={campaign.image}
                        alt={campaign.name}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                      />
                      <div>
                        <p className="font-bold text-gray-900">{campaign.name}</p>
                        <p className="text-xs text-gray-400">{campaign.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 font-medium">{campaign.goal}</td>
                  <td className="px-5 py-4">
                    <AvatarGroup athletes={campaign.athletes} count={campaign.athleteCount} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-5 py-4">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}

          {listLoading && (
            <p className="py-12 text-center text-sm text-gray-400">Loading campaigns…</p>
          )}
          {!listLoading && filteredCampaigns.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Eye className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-900 font-bold mb-1">No campaigns found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters or create a new campaign.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {selectedCampaign && (
          <CampaignDetail
            key="campaign-detail"
            campaign={selectedCampaign}
            onBack={() => setSelectedCampaign(null)}
            brandReviewMode
            onPatchApplication={handlePatchApplication}
            onApplicationsUpdated={refreshSelectedCampaign}
          />
        )}

        {showCreateOverlay && (
          <CreateCampaignOverlay
            key="create-campaign"
            onClose={() => setShowCreateOverlay(false)}
            onLaunch={handleLaunchCampaign}
          />
        )}
      </AnimatePresence>
    </>
  );
}
