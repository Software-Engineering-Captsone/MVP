'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Plus, Search, Eye, ChevronRight, Megaphone, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { DraftResumeSession, SubmitCampaignArgs } from './CreateCampaignOverlay';

const CreateCampaignOverlay = dynamic(
  () => import('./CreateCampaignOverlay').then((m) => m.CreateCampaignOverlay),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-nilink-accent" />
      </div>
    ),
  }
);

const CampaignDetail = dynamic(
  () => import('./CampaignDetail').then((m) => m.CampaignDetail),
  { ssr: false, loading: () => null }
);
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/authFetch';
import { useCampaignsList } from '@/hooks/api/useCampaignsList';
import {
  CampaignPublishRejectedError,
  type CampaignPublishValidationIssue,
  type CampaignPublishValidationResult,
} from '@/lib/campaigns/publishValidation';
import {
  apiCampaignRowToDraftOverlayPrefill,
  apiCampaignToUi,
  type ApiApplicationRow,
  type ApiCampaignRow,
} from '@/lib/campaigns/clientMap';
import type { Campaign, CampaignStatus, ContractedAthlete } from '@/components/dashboard/screens/campaignDashboardTypes';

const WIZARD_SESSION_KEY = 'nilink:dashboard-campaign-create-session';

type WizardSessionPayloadV1 = {
  v: 1;
  open: true;
  step: number;
  draftCampaignId: string | null;
};

function clampWizardSessionStep(step: number): number {
  return Math.min(6, Math.max(1, Math.round(step)));
}

function parseWizardSession(raw: string | null): WizardSessionPayloadV1 | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<WizardSessionPayloadV1>;
    if (o?.v !== 1 || o.open !== true) return null;
    const step = typeof o.step === 'number' && Number.isFinite(o.step) ? clampWizardSessionStep(o.step) : 1;
    const draftCampaignId =
      o.draftCampaignId === null || o.draftCampaignId === undefined
        ? null
        : typeof o.draftCampaignId === 'string'
          ? o.draftCampaignId
          : null;
    return { v: 1, open: true, step, draftCampaignId };
  } catch {
    return null;
  }
}

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
  const [draftResumeSession, setDraftResumeSession] = useState<DraftResumeSession | null>(null);
  const [wizardInstanceKey, setWizardInstanceKey] = useState(0);
  const [wizardInitialStep, setWizardInitialStep] = useState(1);
  const [wizardPersistedStep, setWizardPersistedStep] = useState(1);
  const [wizardPersistedDraftId, setWizardPersistedDraftId] = useState<string | null>(null);
  /** Bumps when the user starts a wizard intentionally, so stale session-restore async cannot overwrite it. */
  const wizardRestoreGenerationRef = useRef(0);
  const { user } = useDashboard();
  const { campaigns: apiCampaigns, isLoading: listLoading, mutate: mutateCampaigns } = useCampaignsList();
  const campaigns = useMemo(() => apiCampaigns.map((c) => apiCampaignToUi(c, [])), [apiCampaigns]);
  const [listError, setListError] = useState<string | null>(null);
  const brandDisplayName = user?.name ?? '';
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  /** Restore create wizard from sessionStorage when returning to this page with an open session. */
  useEffect(() => {
    let cancelled = false;
    const generationAtRestoreStart = wizardRestoreGenerationRef.current;
    try {
      const parsed = parseWizardSession(sessionStorage.getItem(WIZARD_SESSION_KEY));
      if (!parsed) return;

      const step = clampWizardSessionStep(parsed.step);

      const finishOpen = (session: DraftResumeSession | null, errorMsg?: string) => {
        if (cancelled || wizardRestoreGenerationRef.current !== generationAtRestoreStart) return;
        if (errorMsg) {
          setListError(errorMsg);
        }
        setDraftResumeSession(session);
        setWizardInitialStep(step);
        setWizardPersistedStep(step);
        setWizardPersistedDraftId(session?.campaignId ?? null);
        setWizardInstanceKey((k) => k + 1);
        setShowCreateOverlay(true);
      };

      if (parsed.draftCampaignId) {
        void (async () => {
          try {
            const res = await authFetch(`/api/campaigns/${parsed.draftCampaignId}`);
            const data = (await res.json()) as {
              campaign?: ApiCampaignRow;
              error?: string;
            };
            if (cancelled) return;
            if (!res.ok || !data.campaign) {
              finishOpen(
                null,
                data.error ||
                  'Could not restore your draft. You can start a new campaign or open a draft from the list.'
              );
              return;
            }
            const apiRow = data.campaign;
            const remoteStatus = (apiRow.status || 'Draft') as CampaignStatus;
            if (remoteStatus !== 'Draft') {
              finishOpen(
                null,
                'Saved session pointed to a campaign that is no longer a draft. Open it from the list if you need to continue.'
              );
              await mutateCampaigns();
              return;
            }
            finishOpen({
              campaignId: apiRow.id,
              prefill: apiCampaignRowToDraftOverlayPrefill(apiRow),
            });
          } catch {
            if (!cancelled) {
              finishOpen(
                null,
                'Could not restore your draft. You can start a new campaign or open a draft from the list.'
              );
            }
          }
        })();
      } else {
        finishOpen(null);
      }
    } catch {
      try {
        sessionStorage.removeItem(WIZARD_SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
    return () => {
      cancelled = true;
    };
  }, [mutateCampaigns]);

  useEffect(() => {
    if (!showCreateOverlay) return;
    try {
      const payload: WizardSessionPayloadV1 = {
        v: 1,
        open: true,
        step: clampWizardSessionStep(wizardPersistedStep),
        draftCampaignId: wizardPersistedDraftId ?? draftResumeSession?.campaignId ?? null,
      };
      sessionStorage.setItem(WIZARD_SESSION_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [showCreateOverlay, wizardPersistedStep, wizardPersistedDraftId, draftResumeSession?.campaignId]);


  const closeCreateWizard = useCallback(() => {
    setShowCreateOverlay(false);
    setDraftResumeSession(null);
    try {
      sessionStorage.removeItem(WIZARD_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setWizardPersistedDraftId(null);
    setWizardPersistedStep(1);
    setWizardInitialStep(1);
  }, []);

  const handleWizardStepPersist = useCallback((s: number) => {
    setWizardPersistedStep(clampWizardSessionStep(s));
  }, []);

  const handleWizardPersistedIdChange = useCallback((id: string | null) => {
    setWizardPersistedDraftId(id);
  }, []);

  const openDraftInWizard = useCallback(async (row: Campaign) => {
    wizardRestoreGenerationRef.current += 1;
    if (row.status !== 'Draft') {
      setListError('Only draft campaigns can be opened in the campaign editor.');
      return;
    }
    setListError(null);
    try {
      const res = await authFetch(`/api/campaigns/${row.id}`);
      const data = (await res.json()) as {
        campaign?: ApiCampaignRow;
        error?: string;
      };
      if (!res.ok || !data.campaign) {
        setListError(data.error || 'Could not load campaign');
        return;
      }
      const apiRow = data.campaign;
      const remoteStatus = (apiRow.status || 'Draft') as CampaignStatus;
      if (remoteStatus !== 'Draft') {
        setListError(
          'This campaign is no longer a draft. Use the row to open details, or refresh the list.'
        );
        await mutateCampaigns();
        return;
      }
      setDraftResumeSession({
        campaignId: apiRow.id,
        prefill: apiCampaignRowToDraftOverlayPrefill(apiRow),
      });
      setWizardInitialStep(1);
      setWizardPersistedStep(1);
      setWizardPersistedDraftId(apiRow.id);
      setWizardInstanceKey((k) => k + 1);
      setShowCreateOverlay(true);
    } catch {
      setListError('Network error');
    }
  }, [mutateCampaigns]);

  const openEditDraft = useCallback(
    async (e: MouseEvent, row: Campaign) => {
      e.preventDefault();
      e.stopPropagation();
      await openDraftInWizard(row);
    },
    [openDraftInWizard]
  );

  const discardPersistedDraftById = useCallback(
    async (campaignId: string) => {
      let res: Response;
      try {
        res = await authFetch(`/api/campaigns/${campaignId}`, {
          method: 'DELETE',
        });
      } catch {
        setListError('Network error');
        throw new Error('Network error');
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const msg = data.error || 'Could not discard draft';
        setListError(msg);
        throw new Error(msg);
      }
      await mutateCampaigns();
    },
    [mutateCampaigns]
  );

  const handleDiscardDraft = useCallback(
    async (e: MouseEvent, row: Campaign) => {
      e.preventDefault();
      e.stopPropagation();
      if (row.status !== 'Draft') return;
      const ok = window.confirm(`Discard draft "${row.name}"? This cannot be undone.`);
      if (!ok) return;
      try {
        await discardPersistedDraftById(row.id);
        if (draftResumeSession?.campaignId === row.id) {
          closeCreateWizard();
        }
      } catch {
        /* listError set in discardPersistedDraftById */
      }
    },
    [closeCreateWizard, discardPersistedDraftById, draftResumeSession?.campaignId]
  );

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

  const handleSubmitCampaign = async ({
    body,
    intent,
    campaignId,
    quiet,
  }: SubmitCampaignArgs): Promise<{ campaignId: string }> => {
    const jsonBody = {
      ...body,
      intent,
      brandDisplayName: brandDisplayName || undefined,
    };
    try {
      if (campaignId) {
        const res = await authFetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonBody),
        });
        const data = (await res.json()) as {
          campaign?: { id: string };
          error?: string;
          details?: {
            blockingIssues?: CampaignPublishValidationIssue[];
            warningIssues?: CampaignPublishValidationIssue[];
            completenessBySection?: CampaignPublishValidationResult['completenessBySection'];
          };
          blockingIssues?: CampaignPublishValidationIssue[];
          warningIssues?: CampaignPublishValidationIssue[];
          completenessBySection?: CampaignPublishValidationResult['completenessBySection'];
        };
        if (!res.ok) {
          const blockingIssues =
            data.details?.blockingIssues ?? data.blockingIssues;
          if (Array.isArray(blockingIssues) && blockingIssues.length > 0) {
            throw new CampaignPublishRejectedError({
              blockingIssues,
              warningIssues: Array.isArray(data.details?.warningIssues)
                ? data.details.warningIssues
                : Array.isArray(data.warningIssues)
                  ? data.warningIssues
                  : [],
              completenessBySection:
                data.details?.completenessBySection ?? data.completenessBySection ?? {},
            });
          }
          throw new Error(data.error || 'Could not update campaign');
        }
        const id = data.campaign?.id;
        if (!id) {
          throw new Error('Missing campaign id');
        }
        await mutateCampaigns();
        return { campaignId: id };
      }

      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonBody),
      });
      const data = (await res.json()) as {
        campaign?: { id: string };
        error?: string;
        details?: {
          blockingIssues?: CampaignPublishValidationIssue[];
          warningIssues?: CampaignPublishValidationIssue[];
          completenessBySection?: CampaignPublishValidationResult['completenessBySection'];
        };
        blockingIssues?: CampaignPublishValidationIssue[];
        warningIssues?: CampaignPublishValidationIssue[];
        completenessBySection?: CampaignPublishValidationResult['completenessBySection'];
      };
      if (!res.ok) {
        const blockingIssues = data.details?.blockingIssues ?? data.blockingIssues;
        if (Array.isArray(blockingIssues) && blockingIssues.length > 0) {
          throw new CampaignPublishRejectedError({
            blockingIssues,
            warningIssues: Array.isArray(data.details?.warningIssues)
              ? data.details.warningIssues
              : Array.isArray(data.warningIssues)
                ? data.warningIssues
                : [],
            completenessBySection:
              data.details?.completenessBySection ?? data.completenessBySection ?? {},
          });
        }
        throw new Error(data.error || 'Could not create campaign');
      }
      const id = data.campaign?.id;
      if (!id) {
        throw new Error('Missing campaign id');
      }
      await mutateCampaigns();
      return { campaignId: id };
    } catch (e) {
      if (!quiet) {
        const msg = e instanceof Error ? e.message : 'Network error';
        setListError(msg);
      }
      throw e;
    }
  };

  const handlePatchApplication = async (
    applicationId: string,
    status: 'under_review' | 'shortlisted' | 'rejected'
  ) => {
    const res = await authFetch(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as {
      error?: string;
      warnings?: { code?: string; message: string }[];
    };
    if (!res.ok) {
      setListError(data.error || 'Update failed');
      return undefined;
    }
    await refreshSelectedCampaign();
    await mutateCampaigns();
    return { warnings: data.warnings };
  };

  const handlePatchCampaignStatus = async (campaignId: string, status: CampaignStatus) => {
    const res = await authFetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setListError(data.error || 'Could not update campaign status');
      return;
    }
    await refreshSelectedCampaign();
    await mutateCampaigns();
  };

  /** Offer handoff (POST /api/campaigns/[id]/offers) then advance campaign to deal creation. */
  const handleSendSelectedToDeals = async (campaignId: string, applicationIds: string[]) => {
    setListError(null);
    const offerRes = await authFetch(`/api/campaigns/${campaignId}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationIds }),
    });
    const offerData = (await offerRes.json()) as {
      error?: string;
      details?: { applicationId: string; reason: string }[];
    };
    if (!offerRes.ok) {
      const detailMsg =
        offerData.details?.length ?
          ` — ${offerData.details.map((d) => `${d.applicationId}: ${d.reason}`).join('; ')}`
        : '';
      setListError((offerData.error || 'Offer handoff failed') + detailMsg);
      throw new Error(offerData.error || 'Offer handoff failed');
    }
    const patchRes = await authFetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Deal Creation in Progress' as CampaignStatus }),
    });
    const patchData = (await patchRes.json()) as { error?: string };
    if (!patchRes.ok) {
      setListError(patchData.error || 'Could not update campaign status');
      throw new Error(patchData.error || 'Could not update campaign status');
    }
    await refreshSelectedCampaign();
    await mutateCampaigns();
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
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-nilink-ink">
        {/* ── Title (+ stats) in list mode; create wizard keeps only compact errors for vertical space ── */}
        <div
          className={
            showCreateOverlay
              ? listError
                ? 'dash-main-gutter-x shrink-0 border-b border-gray-100 py-2'
                : 'hidden'
              : 'dash-main-gutter-x shrink-0 border-b border-gray-100 py-6'
          }
        >
          {!showCreateOverlay && (
            <DashboardPageHeader
              title="Campaigns"
              subtitle="Create, manage, and track NIL campaigns (saved to server file data/local-campaign-store.json)"
              className="mb-6"
            />
          )}

          {listError && (
            <div
              className={
                showCreateOverlay
                  ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'
                  : 'mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
              }
            >
              {listError}
              <button
                type="button"
                className="ml-3 font-semibold underline"
                onClick={() => {
                  setListError(null);
                  void mutateCampaigns();
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!showCreateOverlay && (
          <>
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
          </>
          )}
        </div>

        {!showCreateOverlay ? (
        <>
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
            onClick={() => {
              wizardRestoreGenerationRef.current += 1;
              setDraftResumeSession(null);
              setWizardInitialStep(1);
              setWizardPersistedStep(1);
              setWizardPersistedDraftId(null);
              setWizardInstanceKey((k) => k + 1);
              setShowCreateOverlay(true);
            }}
            className="focus-nilink inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-nilink-accent px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-nilink-accent-hover sm:ml-auto sm:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.25} />
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
                  onClick={() => {
                    if (campaign.status === 'Draft') {
                      void openDraftInWizard(campaign);
                      return;
                    }
                    void openCampaignDetail(campaign);
                  }}
                  className="group hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer transition-colors"
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
                    <div className="flex items-center justify-end gap-2">
                      {campaign.status === 'Draft' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => void openEditDraft(e, campaign)}
                            className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-nilink-accent-border hover:bg-nilink-accent-soft hover:text-nilink-accent"
                          >
                            Edit Draft
                          </button>
                          <button
                            type="button"
                            onClick={(e) => void handleDiscardDraft(e, campaign)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Discard draft"
                            aria-label="Discard draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <ChevronRight className="w-4 h-4 shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
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
        </>
        ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-6 dash-main-gutter-x">
          <CreateCampaignOverlay
            key={`${wizardInstanceKey}-${draftResumeSession ? `edit-draft-${draftResumeSession.campaignId}` : 'create-campaign'}`}
            draftResume={draftResumeSession}
            initialStep={wizardInitialStep}
            onWizardStepChange={handleWizardStepPersist}
            onPersistedCampaignIdChange={handleWizardPersistedIdChange}
            onClose={closeCreateWizard}
            onSubmitCampaign={handleSubmitCampaign}
            onDiscardPersistedDraft={discardPersistedDraftById}
          />
        </div>
        )}
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
            onPatchCampaignStatus={handlePatchCampaignStatus}
            onSendSelectedToDeals={(applicationIds) =>
              handleSendSelectedToDeals(selectedCampaign.id, applicationIds)
            }
            onApplicationsUpdated={refreshSelectedCampaign}
          />
        )}
      </AnimatePresence>
    </>
  );
}
