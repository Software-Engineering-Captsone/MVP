'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Edit3, Calendar, DollarSign, MapPin,
  Users, Eye, Target, Package, Globe, Lock,
  Check, Clock, Send, MoreHorizontal,
  FileText, Video, Image, ArrowRight, TrendingUp,
  XCircle, UserPlus, Zap, MessageSquare, Loader2, ChevronLeft,
} from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const OfferWizard = dynamic(
  () => import('@/components/offers/OfferWizard').then((m) => m.OfferWizard),
  { ssr: false, loading: () => null }
);
import type {
  Campaign,
  CampaignStatus,
  CandidateStatus,
} from '@/components/dashboard/screens/campaignDashboardTypes';

/* ── Status Badge (shared) ──────────────────────────────────── */
const campaignStatusStyles: Record<CampaignStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-500 border-gray-200',
  'Ready to Launch': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Open for Applications': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Reviewing Candidates': 'bg-amber-50 text-amber-700 border-amber-200',
  'Deal Creation in Progress': 'bg-gray-100 text-nilink-ink border-gray-300',
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Completed': 'bg-gray-100 text-gray-600 border-gray-300',
  'Cancelled': 'bg-red-50 text-red-600 border-red-200',
};

const candidateStatusStyles: Record<CandidateStatus, string> = {
  'Recommended': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Invited': 'bg-gray-50 text-nilink-ink border-gray-200',
  'Applied': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Under Review': 'bg-blue-50 text-blue-700 border-blue-200',
  'Shortlisted': 'bg-amber-50 text-amber-700 border-amber-200',
  'Offer Drafted': 'bg-teal-50 text-teal-700 border-teal-200',
  'Offer Sent': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Offer Declined': 'bg-orange-50 text-orange-700 border-orange-200',
  'Withdrawn': 'bg-slate-100 text-slate-700 border-slate-300',
  'Rejected': 'bg-red-50 text-red-600 border-red-200',
  'Selected': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Sent to Deals': 'bg-nilink-sidebar-muted/15 text-nilink-ink border-nilink-sidebar-muted/30',
  'Contracted': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Declined': 'bg-red-50 text-red-600 border-red-200',
};

const deliverableStatusStyles: Record<string, string> = {
  'Pending': 'bg-gray-100 text-gray-500 border-gray-200',
  'In Progress': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Submitted': 'bg-amber-50 text-amber-700 border-amber-200',
  'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/* ── Tab Definitions ────────────────────────────────────────── */
type TabId = 'overview' | 'candidates' | 'athletes' | 'deliverables' | 'activity';

const baseTabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'athletes', label: 'Athletes' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'activity', label: 'Activity' },
];

type CandidateFilter = 'All' | 'Applied' | 'Under Review' | 'Shortlisted' | 'Offer Drafted' | 'Offer Sent';


function isEligibleForOffer(candidateStatus: CandidateStatus): boolean {
  return candidateStatus === 'Shortlisted' || candidateStatus === 'Offer Drafted';
}

function canRejectCandidate(candidateStatus: CandidateStatus): boolean {
  return ['Applied', 'Under Review', 'Shortlisted', 'Offer Drafted'].includes(candidateStatus);
}

/* ── Main Component ─────────────────────────────────────────── */
interface Props {
  campaign: Campaign;
  onBack: () => void;
  /** When true, show application actions (brand dashboard). */
  brandReviewMode?: boolean;
  onPatchApplication?: (
    applicationId: string,
    status: 'under_review' | 'shortlisted' | 'rejected' | 'offer_drafted'
  ) => Promise<{ warnings?: { code?: string; message: string }[] } | undefined>;
  /**
   * Handoff: create offer draft(s) from selected application ids without changing campaign status.
   */
  onCreateOfferDrafts?: (applicationIds: string[]) => Promise<Record<string, string> | void>;
  initialOfferByApplicationId?: Record<string, string>;
  onApplicationsUpdated?: () => void | Promise<void>;
  onEditCampaign?: () => void;
}

export function CampaignDetail({
  campaign,
  onBack,
  brandReviewMode = false,
  onPatchApplication,
  onCreateOfferDrafts,
  initialOfferByApplicationId = {},
  onApplicationsUpdated,
  onEditCampaign,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    brandReviewMode && campaign.candidates.length > 0 ? 'candidates' : 'overview'
  );
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>('All');
  const [messageAppId, setMessageAppId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const { user: dashboardUser } = useDashboard();
  const currentUserId = dashboardUser?.id ?? null;
  const [threadMessages, setThreadMessages] = useState<
    { id: string; fromUserId: string; body: string; createdAt: string }[]
  >([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [messageThreadError, setMessageThreadError] = useState<string | null>(null);
  const [applicationPatchNotice, setApplicationPatchNotice] = useState<string | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [promotingToOffers, setPromotingToOffers] = useState(false);
  const [offerIdByApplicationId, setOfferIdByApplicationId] =
    useState<Record<string, string>>(initialOfferByApplicationId);
  const [optimisticStatusByCandidateId, setOptimisticStatusByCandidateId] =
    useState<Record<string, CandidateStatus>>({});
  const [rowActionLoadingById, setRowActionLoadingById] = useState<Record<string, string>>({});
  const [wizardOfferId, setWizardOfferId] = useState<string | null>(null);

  const visibleTabs = useMemo(
    () =>
      baseTabs.filter((tab) => {
        if (tab.id === 'athletes') return campaign.athletes.length > 0;
        if (tab.id === 'deliverables') return campaign.deliverables.length > 0;
        if (tab.id === 'activity') return campaign.activity.length > 0;
        return true;
      }),
    [campaign.activity.length, campaign.athletes.length, campaign.deliverables.length]
  );

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(campaign.candidates.length > 0 ? 'candidates' : 'overview');
    }
  }, [activeTab, campaign.candidates.length, visibleTabs]);

  useEffect(() => {
    setOfferIdByApplicationId(initialOfferByApplicationId);
  }, [initialOfferByApplicationId]);

  const candidatesWithOptimisticStatus = useMemo(
    () =>
      campaign.candidates.map((candidate) => ({
        ...candidate,
        status: optimisticStatusByCandidateId[candidate.id] ?? candidate.status,
      })),
    [campaign.candidates, optimisticStatusByCandidateId]
  );

  const filteredCandidates = useMemo(() => {
    if (candidateFilter === 'All') return candidatesWithOptimisticStatus;
    return candidatesWithOptimisticStatus.filter((c) => c.status === candidateFilter);
  }, [candidatesWithOptimisticStatus, candidateFilter]);

  const selectableCandidateIds = useMemo(
    () => filteredCandidates.filter((c) => isEligibleForOffer(c.status)).map((c) => c.id),
    [filteredCandidates]
  );

  const selectedEligibleCandidateIds = useMemo(
    () => Array.from(selectedCandidates).filter((id) => selectableCandidateIds.includes(id)),
    [selectedCandidates, selectableCandidateIds]
  );

  const toggleCandidate = (id: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (
      selectableCandidateIds.length > 0 &&
      selectedEligibleCandidateIds.length === selectableCandidateIds.length
    ) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(selectableCandidateIds));
    }
  };

  useEffect(() => {
    if (!messageAppId) {
      setThreadMessages([]);
      setActiveThreadId(null);
      setMessageThreadError(null);
      return;
    }
    let cancelled = false;
    setThreadLoading(true);
    setActiveThreadId(null);
    setMessageThreadError(null);
    void (async () => {
      try {
        const res = await authFetch(`/api/applications/${messageAppId}/messages`);
        const data = (await res.json()) as {
          threadId?: string;
          messages?: { id: string; fromUserId: string; body: string; createdAt: string }[];
          error?: string;
        };
        if (!cancelled && res.ok && data.messages) {
          setThreadMessages(data.messages);
          if (data.threadId) setActiveThreadId(data.threadId);
        } else if (!cancelled && !res.ok) {
          setMessageThreadError(data.error || 'Could not load messages');
        }
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messageAppId]);

  useEffect(() => {
    if (!activeThreadId || threadLoading) return;
    void authFetch(`/api/chat/threads/${activeThreadId}/read`, { method: 'POST' });
  }, [activeThreadId, threadLoading]);

  const setRowLoading = (applicationId: string, label: string | null) => {
    setRowActionLoadingById((prev) => {
      const next = { ...prev };
      if (label) next[applicationId] = label;
      else delete next[applicationId];
      return next;
    });
  };

  const patchCandidateStatus = async (
    applicationId: string,
    status: 'under_review' | 'shortlisted' | 'rejected' | 'offer_drafted',
    optimisticStatus: CandidateStatus,
    loadingLabel: string
  ) => {
    if (!onPatchApplication) return;
    setRowLoading(applicationId, loadingLabel);
    const previous = optimisticStatusByCandidateId[applicationId];
    setOptimisticStatusByCandidateId((prev) => ({ ...prev, [applicationId]: optimisticStatus }));
    try {
      const result = await onPatchApplication(applicationId, status);
      if (result?.warnings?.length) {
        setApplicationPatchNotice(result.warnings.map((warning) => warning.message).join(' '));
      }
    } catch (error) {
      setOptimisticStatusByCandidateId((prev) => {
        const next = { ...prev };
        if (previous) next[applicationId] = previous;
        else delete next[applicationId];
        return next;
      });
      setApplicationPatchNotice(error instanceof Error ? error.message : 'Application update failed.');
    } finally {
      setRowLoading(applicationId, null);
    }
  };

  const createOfferDrafts = async (applicationIds: string[]) => {
    if (applicationIds.length === 0) return {};
    if (onCreateOfferDrafts) {
      const map = (await onCreateOfferDrafts(applicationIds)) ?? {};
      setOfferIdByApplicationId((prev) => ({ ...prev, ...map }));
      return map;
    }

    const res = await authFetch(`/api/campaigns/${campaign.id}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationIds }),
    });
    const data = (await res.json()) as {
      offers?: { id: string; applicationId?: string | null }[];
      error?: string;
    };
    if (!res.ok || !data.offers) {
      throw new Error(data.error || 'Offer draft could not be created.');
    }
    const map = Object.fromEntries(
      data.offers
        .filter((offer) => offer.applicationId)
        .map((offer) => [String(offer.applicationId), offer.id])
    );
    setOfferIdByApplicationId((prev) => ({ ...prev, ...map }));
    return map;
  };

  const openOrCreateOffer = async (applicationId: string) => {
    const existingOfferId = offerIdByApplicationId[applicationId];
    if (existingOfferId) {
      setWizardOfferId(existingOfferId);
      return;
    }
    setRowLoading(applicationId, 'Creating offer');
    setOptimisticStatusByCandidateId((prev) => ({ ...prev, [applicationId]: 'Offer Drafted' }));
    try {
      const map = await createOfferDrafts([applicationId]);
      const offerId = map[applicationId];
      if (offerId) setWizardOfferId(offerId);
      await onApplicationsUpdated?.();
    } catch (error) {
      setApplicationPatchNotice(error instanceof Error ? error.message : 'Offer draft could not be created.');
    } finally {
      setRowLoading(applicationId, null);
    }
  };

  const sendThreadMessage = async () => {
    if (!messageAppId || !messageDraft.trim() || !currentUserId) return;
    setMessageThreadError(null);
    const text = messageDraft.trim();
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      fromUserId: currentUserId,
      body: text,
      createdAt: new Date().toISOString(),
    };
    setThreadMessages((prev) => [...prev, optimistic]);
    setMessageDraft('');
    const res = await authFetch(`/api/applications/${messageAppId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    if (!res.ok) {
      setThreadMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageDraft(text);
      const errJson = (await res.json().catch(() => ({}))) as { error?: string };
      setMessageThreadError(errJson.error || 'Message could not be sent. Please try again.');
      return;
    }
    const data = (await res.json()) as {
      application?: { messages?: { id: string; fromUserId: string; body: string; createdAt: string }[] };
    };
    if (data.application?.messages) setThreadMessages(data.application.messages);
    await onApplicationsUpdated?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-1 flex-col min-h-0 overflow-hidden bg-white font-sans text-nilink-ink"
    >
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-gray-100 bg-white dash-main-gutter-x py-4">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
            <button
              onClick={onBack}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900"
              aria-label="Back to campaigns"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm leading-tight">
                <li className="truncate text-gray-400">Campaigns</li>
                <li className="shrink-0 select-none text-gray-300" aria-hidden>/</li>
                <li className="truncate font-semibold text-nilink-ink" aria-current="page">{campaign.name}</li>
              </ol>
            </nav>
            <button
              type="button"
              onClick={onEditCampaign}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Campaign
            </button>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1
                  className="text-3xl font-black uppercase tracking-wide"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {campaign.name}
                </h1>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${campaignStatusStyles[campaign.status]}`}>
                  {campaign.status}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-400">{campaign.subtitle} · {campaign.goal}</p>
            </div>
          </div>
        </div>

        {brandReviewMode && applicationPatchNotice ? (
          <div className="dash-main-gutter-x shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 leading-snug">{applicationPatchNotice}</p>
              <button
                type="button"
                className="shrink-0 text-xs font-bold uppercase tracking-wide text-amber-900 underline"
                onClick={() => setApplicationPatchNotice(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Tab Bar ── */}
      <div className="dash-main-gutter-x flex shrink-0 items-center gap-6 border-b border-gray-100">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-sm font-medium py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-nilink-ink text-nilink-ink'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'candidates' && campaign.candidates.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-full">
                {campaign.candidates.length}
              </span>
            )}
            {tab.id === 'athletes' && campaign.athletes.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full">
                {campaign.athletes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-auto">
        {/* ════════════════════ OVERVIEW ════════════════════ */}
        {activeTab === 'overview' && (
          <div className="py-6 dash-main-gutter-x">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: Users, label: 'Candidates', value: campaign.candidateCount, color: 'text-[#2A90B0]' },
                { icon: Target, label: 'Athletes', value: campaign.athleteCount, color: 'text-emerald-600' },
                {
                  icon: Eye,
                  label: 'Applications',
                  value: campaign.candidates.filter((c) => c.status === 'Applied' || c.status === 'Under Review').length,
                  color: 'text-nilink-accent'
                },
                { icon: TrendingUp, label: 'Deliverables', value: campaign.deliverables.length, color: 'text-nilink-ink' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-gray-400" />
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  </div>
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Campaign Info */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Campaign Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Goal</p>
                      <p className="text-sm font-bold text-nilink-ink">{campaign.goal}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Duration</p>
                      <p className="text-sm font-bold text-nilink-ink">{campaign.startDate} – {campaign.endDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Budget</p>
                      <p className="text-sm font-bold text-nilink-accent">{campaign.budget}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Location</p>
                      <p className="text-sm font-bold text-nilink-ink">{campaign.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package & Sourcing */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Package & Sourcing</h3>
                <div className="mb-4">
                  <p className="mb-2 text-sm font-bold text-nilink-ink">{campaign.packageName}</p>
                  <div className="space-y-1.5">
                    {campaign.packageDetails.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-nilink-accent shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    {campaign.visibility === 'Public' ? (
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className="font-medium">{campaign.visibility} Campaign</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Zap className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">
                      {campaign.acceptApplications ? 'Accepting Applications' : 'Invite Only'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Brief */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Campaign Brief</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{campaign.brief}</p>
            </div>
          </div>
        )}

        {/* ════════════════════ CANDIDATES ════════════════════ */}
        {activeTab === 'candidates' && (
          <div className="flex flex-col h-full">
            {/* Candidates Actions */}
            <div className="dash-main-gutter-x flex shrink-0 flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
                <button
                  type="button"
                  onClick={selectAll}
                  className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={
                      selectableCandidateIds.length > 0 &&
                      selectedEligibleCandidateIds.length === selectableCandidateIds.length
                    }
                    readOnly
                    className="rounded border-gray-300 accent-nilink-accent"
                  />
                  Select All Eligible
                </button>
                <p className="max-w-md text-xs text-gray-400">
                  Shortlisted candidates can be turned into editable offer drafts.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</span>
                  <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    {(['All', 'Applied', 'Under Review', 'Shortlisted', 'Offer Drafted', 'Offer Sent'] as const).map((f) => {
                      const on = candidateFilter === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => {
                            setCandidateFilter(f);
                          }}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 ${
                            on
                              ? 'bg-white text-nilink-ink shadow-sm'
                              : 'text-gray-500 hover:bg-white hover:text-gray-700'
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {selectedEligibleCandidateIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (promotingToOffers) return;
                    if (onCreateOfferDrafts) {
                      setPromotingToOffers(true);
                      void createOfferDrafts(selectedEligibleCandidateIds)
                        .then(() => {
                          setOptimisticStatusByCandidateId((prev) => {
                            const next = { ...prev };
                            for (const id of selectedEligibleCandidateIds) next[id] = 'Offer Drafted';
                            return next;
                          });
                          setSelectedCandidates(new Set());
                          return onApplicationsUpdated?.();
                        })
                        .catch((error) => {
                          setApplicationPatchNotice(error instanceof Error ? error.message : 'Offer drafts failed.');
                        })
                        .finally(() => setPromotingToOffers(false));
                      return;
                    }
                  }}
                  disabled={
                    promotingToOffers ||
                    !onCreateOfferDrafts ||
                    selectedEligibleCandidateIds.length === 0
                  }
                  className="flex items-center gap-2 rounded-lg bg-nilink-accent px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-nilink-accent-hover"
                >
                  <Send className="w-3.5 h-3.5" />
                  {promotingToOffers
                    ? 'Creating drafts...'
                    : `Create offer drafts (${selectedEligibleCandidateIds.length})`}
                </button>
              )}
            </div>

            {/* Candidates Table */}
            <div className="flex-1 overflow-auto pb-6 dash-main-gutter-x">
              {campaign.candidates.length > 0 ? (
                filteredCandidates.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] font-bold text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3 rounded-l-xl w-10"></th>
                      <th className="px-5 py-3">Athlete</th>
                      <th className="px-5 py-3">Sport</th>
                      <th className="px-5 py-3">Followers</th>
                      <th className="px-5 py-3">Engagement</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Applied</th>
                      <th className="px-5 py-3 rounded-r-xl" scope="col">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((candidate) => {
                      const loadingLabel = rowActionLoadingById[candidate.id];
                      const offerId = offerIdByApplicationId[candidate.id];
                      const showOfferAction =
                        brandReviewMode &&
                        (candidate.status === 'Shortlisted' ||
                          candidate.status === 'Offer Drafted');
                      return (
                      <tr
                        key={candidate.id}
                        className="group hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.has(candidate.id)}
                            disabled={!isEligibleForOffer(candidate.status)}
                            onChange={() => toggleCandidate(candidate.id)}
                            className={`rounded border-gray-300 accent-nilink-accent ${
                              isEligibleForOffer(candidate.status) ? '' : 'cursor-not-allowed opacity-40'
                            }`}
                            title={
                              isEligibleForOffer(candidate.status)
                                ? 'Selected for offer handoff'
                                : 'Move the application to Shortlisted before creating an offer draft'
                            }
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={candidate.image}
                              alt={candidate.name}
                              className="w-8 h-8 rounded-full object-cover bg-gray-100"
                            />
                            <div>
                              <p className="font-bold text-gray-900">{candidate.name}</p>
                              <p className="text-xs text-gray-400">{candidate.school}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{candidate.sport}</td>
                        <td className="px-5 py-4 font-medium text-gray-900">{candidate.followers}</td>
                        <td className="px-5 py-4 font-medium text-gray-900">{candidate.engagement}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${candidateStatusStyles[candidate.status]}`}>
                            {candidate.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-400 text-xs">{candidate.appliedDate}</td>
                        <td className="px-5 py-4">
                          {brandReviewMode ? (
                            <div className="flex min-w-[260px] flex-wrap items-center gap-1.5">
                              {loadingLabel ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  {loadingLabel}
                                </span>
                              ) : null}
                              {onPatchApplication && candidate.status === 'Applied' ? (
                                <button
                                  type="button"
                                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  disabled={Boolean(loadingLabel)}
                                  onClick={() =>
                                    void patchCandidateStatus(
                                      candidate.id,
                                      'under_review',
                                      'Under Review',
                                      'Updating'
                                    )
                                  }
                                >
                                  Move to review
                                </button>
                              ) : null}
                              {onPatchApplication &&
                              (candidate.status === 'Applied' || candidate.status === 'Under Review') ? (
                                <button
                                  type="button"
                                  className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                                  disabled={Boolean(loadingLabel)}
                                  onClick={() =>
                                    void patchCandidateStatus(
                                      candidate.id,
                                      'shortlisted',
                                      'Shortlisted',
                                      'Shortlisting'
                                    )
                                  }
                                >
                                  Shortlist
                                </button>
                              ) : null}
                              {showOfferAction ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                                  disabled={Boolean(loadingLabel)}
                                  onClick={() => void openOrCreateOffer(candidate.id)}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  {offerId ? 'Edit offer' : 'Create offer'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                disabled={Boolean(loadingLabel)}
                                onClick={() => setMessageAppId(candidate.id)}
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                Message
                              </button>
                              {onPatchApplication && canRejectCandidate(candidate.status) ? (
                                <button
                                  type="button"
                                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  disabled={Boolean(loadingLabel)}
                                  onClick={() =>
                                    void patchCandidateStatus(candidate.id, 'rejected', 'Rejected', 'Rejecting')
                                  }
                                >
                                  Reject
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                ) : (
                  <div className="px-4 py-16 text-center text-sm text-gray-400">
                    <p>No candidates match this filter.</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-gray-900 font-bold mb-1">No candidates yet</p>
                  <p className="text-sm text-gray-400 max-w-md">
                    Candidates will appear here once your campaign is launched and athletes begin applying or are invited.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ ATHLETES ════════════════════ */}
        {activeTab === 'athletes' && (
          <div className="py-6 dash-main-gutter-x">
            {campaign.athletes.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {campaign.athletes.map(athlete => (
                  <div
                    key={athlete.id}
                    className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={athlete.image}
                        alt={athlete.name}
                        className="w-10 h-10 rounded-full object-cover bg-gray-100"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{athlete.name}</p>
                        <p className="text-xs text-gray-400">{athlete.sport} · {athlete.school}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contract Value</p>
                        <p className="text-lg font-black text-nilink-ink">{athlete.contractValue}</p>
                      </div>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        Contracted
                      </span>
                    </div>

                    {/* Deliverable Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deliverables</p>
                        <p className="text-xs font-bold text-gray-600">{athlete.deliverablesCompleted}/{athlete.deliverablesTotal}</p>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-nilink-accent-bright transition-all"
                          style={{
                            width: `${athlete.deliverablesTotal > 0 ? (athlete.deliverablesCompleted / athlete.deliverablesTotal) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <UserPlus className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-900 font-bold mb-1">No contracted athletes</p>
                <p className="text-sm text-gray-400 max-w-md">
                  Athletes will appear here once candidates complete the deal process and are contracted to this campaign.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ DELIVERABLES ════════════════════ */}
        {activeTab === 'deliverables' && (
          <div className="py-6 dash-main-gutter-x">
            {campaign.deliverables.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] font-bold text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 rounded-l-xl">Type</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Assigned To</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 rounded-r-xl w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.deliverables.map(deliverable => (
                    <tr
                      key={deliverable.id}
                      className="group hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {deliverable.type.includes('Reel') || deliverable.type.includes('Video') || deliverable.type.includes('TikTok') ? (
                            <Video className="w-4 h-4 text-gray-400" />
                          ) : deliverable.type.includes('Story') ? (
                            <FileText className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Image className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="font-bold text-gray-900">{deliverable.type}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 max-w-xs truncate">{deliverable.description}</td>
                      <td className="px-5 py-4">
                        {deliverable.assignedAthlete ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={deliverable.assignedAthleteImage || ''}
                              alt={deliverable.assignedAthlete}
                              className="w-6 h-6 rounded-full object-cover bg-gray-100"
                            />
                            <span className="text-sm font-medium text-gray-900">{deliverable.assignedAthlete}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500">{deliverable.dueDate}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${deliverableStatusStyles[deliverable.status]}`}>
                          {deliverable.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-900 font-bold mb-1">No deliverables yet</p>
                <p className="text-sm text-gray-400 max-w-md">
                  Deliverables will be tracked here once athletes are contracted and assigned content tasks.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ ACTIVITY ════════════════════ */}
        {activeTab === 'activity' && (
          <div className="py-6 dash-main-gutter-x">
            {campaign.activity.length > 0 ? (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-6 bottom-6 w-px bg-gray-100" />

                <div className="space-y-0">
                  {campaign.activity.map((item) => {
                    const getIcon = () => {
                      switch (item.type) {
                        case 'status_change': return <ArrowRight className="w-3.5 h-3.5" />;
                        case 'candidate_action': return <Users className="w-3.5 h-3.5" />;
                        case 'deliverable': return <FileText className="w-3.5 h-3.5" />;
                        case 'system': return <Zap className="w-3.5 h-3.5" />;
                      }
                    };

                    const getIconColor = () => {
                      switch (item.type) {
                        case 'status_change': return 'bg-emerald-100 text-emerald-700';
                        case 'candidate_action': return 'bg-nilink-accent-soft text-nilink-accent';
                        case 'deliverable': return 'bg-gray-100 text-nilink-ink';
                        case 'system': return 'bg-gray-100 text-gray-500';
                      }
                    };

                    return (
                      <div key={item.id} className="flex items-start gap-4 py-4 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${getIconColor()}`}>
                          {getIcon()}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-900 font-bold mb-1">No activity yet</p>
                <p className="text-sm text-gray-400">Activity events will be logged here as your campaign progresses.</p>
              </div>
            )}
          </div>
        )}
      </div>

        {wizardOfferId && (
          <OfferWizard
            offerId={wizardOfferId}
            onClose={() => {
              setWizardOfferId(null);
              void onApplicationsUpdated?.();
            }}
            onSubmitted={() => {
              setOptimisticStatusByCandidateId((prev) => {
                const next = { ...prev };
                for (const [applicationId, offerId] of Object.entries(offerIdByApplicationId)) {
                  if (offerId === wizardOfferId) next[applicationId] = 'Offer Sent';
                }
                return next;
              });
              void onApplicationsUpdated?.();
            }}
          />
        )}

        {messageAppId && (
          <>
            <button
              type="button"
              className="absolute inset-0 z-[70] bg-black/25"
              aria-label="Close messages"
              onClick={() => setMessageAppId(null)}
            />
            <div className="absolute right-0 top-0 z-[80] flex h-full w-full max-w-[380px] flex-col border-l border-gray-100 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-bold text-nilink-ink">Application messages</p>
                <button
                  type="button"
                  onClick={() => setMessageAppId(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
                {messageThreadError ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    {messageThreadError}
                  </p>
                ) : null}
                {threadLoading ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : threadMessages.length === 0 ? (
                  !messageThreadError ? (
                    <p className="text-sm text-gray-400">No messages yet. Say hello.</p>
                  ) : null
                ) : (
                  threadMessages.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm"
                    >
                      <p className="text-xs text-gray-400">
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-gray-800">{m.body}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 border-t border-gray-100 p-3">
                <input
                  type="text"
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void sendThreadMessage();
                  }}
                />
                <button
                  type="button"
                  onClick={() => void sendThreadMessage()}
                  className="shrink-0 rounded-lg bg-nilink-accent px-4 py-2 text-sm font-semibold text-white hover:bg-nilink-accent-hover"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
    </motion.div>
  );
}
