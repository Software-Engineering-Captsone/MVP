'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Edit3, Calendar, DollarSign, MapPin,
  Users, Eye, Target, Package, Globe, Lock,
  Check, Clock, Send, MoreHorizontal,
  FileText, Video, Image, ArrowRight, TrendingUp,
  XCircle, UserPlus, Zap, MessageSquare, Loader2,
} from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const OfferWizard = dynamic(
  () => import('@/components/offers/OfferWizard').then((m) => m.OfferWizard),
  { ssr: false, loading: () => null }
);
import { COPY_INVITE_TO_CAMPAIGN, COPY_REFERRAL, COPY_SEND_OFFER } from '@/lib/productCopy';
import type {
  ApplicationQueueSource,
  Campaign,
  CampaignStatus,
  CandidateStatus,
} from '@/components/dashboard/screens/campaignDashboardTypes';

const applicationSourceStyles: Record<ApplicationQueueSource, string> = {
  referral: 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  regular: 'bg-gray-50 text-gray-600 border-gray-200',
};

/* ── Status Badge (shared) ──────────────────────────────────── */
const campaignStatusStyles: Record<CampaignStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-500 border-gray-200',
  'Ready to Launch': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Open for Applications': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Reviewing Candidates': 'bg-amber-50 text-amber-700 border-amber-200',
  'Deal Creation in Progress': 'bg-gray-100 text-nilink-ink border-gray-300',
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Completed': 'bg-gray-100 text-gray-600 border-gray-300',
};

const candidateStatusStyles: Record<CandidateStatus, string> = {
  'Recommended': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Invited': 'bg-gray-50 text-nilink-ink border-gray-200',
  'Applied': 'bg-nilink-accent-soft text-nilink-accent border-nilink-accent-border',
  'Under Review': 'bg-blue-50 text-blue-700 border-blue-200',
  'Shortlisted': 'bg-amber-50 text-amber-700 border-amber-200',
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

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'athletes', label: 'Athletes' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'activity', label: 'Activity' },
];

type CandidateFilter = 'All' | 'Applied' | 'Under Review' | 'Shortlisted' | 'Offer Sent';

/** Application queue slice (referral vs organic) for the candidates table. */
type QueueSourceFilter = 'all' | 'referral' | 'regular';

function isEligibleForOffer(candidateStatus: CandidateStatus): boolean {
  return candidateStatus === 'Shortlisted';
}

/* ── Main Component ─────────────────────────────────────────── */
interface Props {
  campaign: Campaign;
  onBack: () => void;
  /** When true, show application actions (brand dashboard). */
  brandReviewMode?: boolean;
  onPatchApplication?: (
    applicationId: string,
    status: 'under_review' | 'shortlisted' | 'rejected'
  ) => Promise<{ warnings?: { code?: string; message: string }[] } | undefined>;
  onPatchCampaignStatus?: (campaignId: string, status: CampaignStatus) => Promise<void>;
  /**
   * Handoff: create offer draft(s) from selected application ids, then caller may advance campaign.
   * When set, “Send Shortlisted to Offers” uses this instead of only patching campaign status.
   */
  onSendSelectedToDeals?: (applicationIds: string[]) => Promise<void>;
  onApplicationsUpdated?: () => void | Promise<void>;
}

export function CampaignDetail({
  campaign,
  onBack,
  brandReviewMode = false,
  onPatchApplication,
  onPatchCampaignStatus,
  onSendSelectedToDeals,
  onApplicationsUpdated,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>('All');
  const [queueSourceFilter, setQueueSourceFilter] = useState<QueueSourceFilter>('all');
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null);
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
  const [offerIdByApplicationId, setOfferIdByApplicationId] = useState<Record<string, string>>({});
  const [offersMapLoading, setOffersMapLoading] = useState(false);
  const [offersMapError, setOffersMapError] = useState<string | null>(null);
  const [wizardOfferId, setWizardOfferId] = useState<string | null>(null);


  const filteredCandidates = useMemo(() => {
    let list =
      candidateFilter === 'All'
        ? campaign.candidates
        : campaign.candidates.filter((c) => c.status === candidateFilter);
    if (queueSourceFilter === 'referral') {
      list = list.filter((c) => c.applicationSource === 'referral');
    } else if (queueSourceFilter === 'regular') {
      list = list.filter((c) => c.applicationSource !== 'referral');
    }
    return list;
  }, [campaign.candidates, candidateFilter, queueSourceFilter]);

  const referralApplicationCount = useMemo(
    () => campaign.candidates.filter((c) => c.applicationSource === 'referral').length,
    [campaign.candidates]
  );

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

  useEffect(() => {
    if (!brandReviewMode) return;
    let cancelled = false;
    setOffersMapLoading(true);
    setOffersMapError(null);
    void (async () => {
      try {
        const res = await authFetch(`/api/campaigns/${campaign.id}/offers`);
        const data = (await res.json()) as {
          offers?: { id: string; applicationId: string | null }[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.offers) {
          setOfferIdByApplicationId({});
          setOffersMapError(data.error || 'Could not load offer links');
          return;
        }
        const map: Record<string, string> = {};
        for (const o of data.offers) {
          if (o.applicationId) map[o.applicationId] = o.id;
        }
        setOfferIdByApplicationId(map);
      } catch {
        if (!cancelled) {
          setOfferIdByApplicationId({});
          setOffersMapError('Network error while loading offers');
        }
      } finally {
        if (!cancelled) setOffersMapLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandReviewMode, campaign.id, campaign.status, campaign.candidates.length]);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative flex h-[800px] max-h-[90vh] w-[1100px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white text-nilink-ink shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                <p className="text-sm text-gray-400 mt-0.5">{campaign.subtitle} · {campaign.goal}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                <Edit3 className="w-3.5 h-3.5" />
                Edit Campaign
              </button>
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
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
        {tabs.map(tab => (
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
                  Only <span className="font-semibold text-gray-600">Shortlisted</span> candidates can be sent
                  to offers.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</span>
                  <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    {(['All', 'Applied', 'Under Review', 'Shortlisted', 'Offer Sent'] as const).map((f) => {
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Queue</span>
                  <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    {(
                      [
                        { id: 'all' as const, label: 'All' },
                        { id: 'referral' as const, label: COPY_REFERRAL },
                        { id: 'regular' as const, label: 'Regular' },
                      ] as const
                    ).map(({ id, label }) => {
                      const on = queueSourceFilter === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setQueueSourceFilter(id)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 ${
                            on
                              ? 'bg-white text-nilink-ink shadow-sm'
                              : 'text-gray-500 hover:bg-white hover:text-gray-700'
                          }`}
                        >
                          {label}
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
                    if (onSendSelectedToDeals) {
                      setPromotingToOffers(true);
                      void onSendSelectedToDeals(selectedEligibleCandidateIds)
                        .then(() => setSelectedCandidates(new Set()))
                        .catch(() => {})
                        .finally(() => setPromotingToOffers(false));
                      return;
                    }
                    if (!onPatchCampaignStatus) return;
                    setPromotingToOffers(true);
                    void onPatchCampaignStatus(campaign.id, 'Deal Creation in Progress').finally(() => {
                      setPromotingToOffers(false);
                    });
                  }}
                  disabled={
                    promotingToOffers ||
                    (!onSendSelectedToDeals && !onPatchCampaignStatus) ||
                    selectedEligibleCandidateIds.length === 0
                  }
                  className="flex items-center gap-2 rounded-lg bg-nilink-accent px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-nilink-accent-hover"
                >
                  <Send className="w-3.5 h-3.5" />
                  {promotingToOffers
                    ? 'Moving to offer stage...'
                    : `Send Shortlisted to Offers (${selectedEligibleCandidateIds.length})`}
                </button>
              )}
            </div>

            {/* Candidates Table */}
            <div className="flex-1 overflow-auto pb-6 dash-main-gutter-x">
              {campaign.candidates.length > 0 && referralApplicationCount === 0 ? (
                <div
                  className="mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/90 px-4 py-3 text-sm text-gray-600"
                  role="status"
                >
                  <p className="font-semibold text-gray-800">No {COPY_REFERRAL} applications in this queue yet</p>
                  <p className="mt-1 text-xs text-gray-500">
                    When you use {COPY_INVITE_TO_CAMPAIGN} from an athlete profile, new rows appear here with the{' '}
                    {COPY_REFERRAL} badge.
                  </p>
                </div>
              ) : null}
              {campaign.candidates.length > 0 ? (
                filteredCandidates.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] font-bold text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3 rounded-l-xl w-10"></th>
                      <th className="px-5 py-3">Athlete</th>
                      <th className="px-5 py-3" scope="col">
                        Source <span className="sr-only">(Referral or Regular)</span>
                      </th>
                      <th className="px-5 py-3">Sport</th>
                      <th className="px-5 py-3">Followers</th>
                      <th className="px-5 py-3">Engagement</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Applied</th>
                      <th className="px-5 py-3" scope="col">
                        {COPY_SEND_OFFER}
                      </th>
                      <th className="px-5 py-3 rounded-r-xl w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((candidate) => (
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
                                : 'Only candidates with Shortlisted status can be sent to offers'
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
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${applicationSourceStyles[candidate.applicationSource]}`}
                          >
                            {candidate.applicationSource === 'referral' ? COPY_REFERRAL : 'Regular'}
                          </span>
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
                          {brandReviewMode && offersMapLoading ? (
                            <span
                              className="inline-flex items-center gap-1 text-xs text-gray-500"
                              role="status"
                              aria-live="polite"
                            >
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                              Loading…
                            </span>
                          ) : brandReviewMode && offersMapError ? (
                            <span className="text-xs text-red-600" role="alert" title={offersMapError}>
                              Unavailable
                            </span>
                          ) : brandReviewMode && offerIdByApplicationId[candidate.id] ? (
                            <button
                              type="button"
                              onClick={() => setWizardOfferId(offerIdByApplicationId[candidate.id])}
                              className="text-xs font-bold uppercase tracking-wide text-nilink-accent underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-nilink-accent"
                            >
                              {COPY_SEND_OFFER}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="relative px-5 py-4 text-right">
                          {brandReviewMode && onPatchApplication && (
                            <>
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400"
                                aria-label="Application actions"
                                onClick={() =>
                                  setOpenMenuForId((v) => (v === candidate.id ? null : candidate.id))
                                }
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {openMenuForId === candidate.id && (
                                <div className="absolute right-2 top-9 z-30 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-xl text-left">
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                      setMessageAppId(candidate.id);
                                      setOpenMenuForId(null);
                                    }}
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Message
                                  </button>
                                  {candidate.status === 'Applied' && (
                                    <button
                                      type="button"
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                      onClick={() => {
                                        setOpenMenuForId(null);
                                        void (async () => {
                                          const r = await onPatchApplication(candidate.id, 'under_review');
                                          if (r?.warnings?.length) {
                                            setApplicationPatchNotice(
                                              r.warnings.map((w) => w.message).join(' ')
                                            );
                                          }
                                        })();
                                      }}
                                    >
                                      Move to review
                                    </button>
                                  )}
                                  {(candidate.status === 'Applied' || candidate.status === 'Under Review') && (
                                    <button
                                      type="button"
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                      onClick={() => {
                                        setOpenMenuForId(null);
                                        void (async () => {
                                          const r = await onPatchApplication(candidate.id, 'shortlisted');
                                          if (r?.warnings?.length) {
                                            setApplicationPatchNotice(
                                              r.warnings.map((w) => w.message).join(' ')
                                            );
                                          }
                                        })();
                                      }}
                                    >
                                      Shortlist
                                    </button>
                                  )}
                                  {(candidate.status === 'Applied' ||
                                    candidate.status === 'Under Review' ||
                                    candidate.status === 'Shortlisted') && (
                                    <button
                                      type="button"
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                      onClick={() => {
                                        setOpenMenuForId(null);
                                        void (async () => {
                                          const r = await onPatchApplication(candidate.id, 'rejected');
                                          if (r?.warnings?.length) {
                                            setApplicationPatchNotice(
                                              r.warnings.map((w) => w.message).join(' ')
                                            );
                                          }
                                        })();
                                      }}
                                    >
                                      Reject
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                ) : (
                  <div className="space-y-2 px-4 py-16 text-center text-sm text-gray-400">
                    <p>No candidates match this filter.</p>
                    {queueSourceFilter === 'referral' && referralApplicationCount === 0 ? (
                      <p className="text-gray-500">
                        No {COPY_REFERRAL} applications on this campaign yet — use {COPY_INVITE_TO_CAMPAIGN} from an
                        athlete profile.
                      </p>
                    ) : null}
                    {queueSourceFilter === 'referral' && referralApplicationCount > 0 ? (
                      <p className="text-gray-500">
                        No {COPY_REFERRAL} rows in this status view — try Status: All.
                      </p>
                    ) : null}
                    {queueSourceFilter === 'regular' && campaign.candidates.length > 0 ? (
                      <p className="text-gray-500">No regular (non-referral) rows in this status view.</p>
                    ) : null}
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
                  {campaign.activity.map((item, idx) => {
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
              void (async () => {
                const res = await authFetch(`/api/campaigns/${campaign.id}/offers`);
                const data = (await res.json()) as {
                  offers?: { id: string; applicationId: string | null }[];
                };
                if (!res.ok || !data.offers) return;
                const map: Record<string, string> = {};
                for (const o of data.offers) {
                  if (o.applicationId) map[o.applicationId] = o.id;
                }
                setOfferIdByApplicationId(map);
              })();
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
    </div>
  );
}
