'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, Target,
  Activity, ChevronRight,
  DollarSign, BarChart3, ArrowUpRight, Instagram, Heart, Megaphone,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { staggerContainer, staggerItem } from '@/components/dashboard/dashboardMotion';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useSavedMarketplace } from '@/hooks/useSavedMarketplace';
import { formatCampaignRelativePosted } from '@/lib/campaigns/clientMap';
import { useCampaignsList } from '@/hooks/api/useCampaignsList';
import { authFetch } from '@/lib/authFetch';
import { compensationAmountFromDealSnapshot, fetchDealsList, type ApiDeal } from '@/lib/deals/dashboardDealsClient';

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68a6.34 6.34 0 0 0 6.27 6.36 6.34 6.34 0 0 0 6.27-6.36v-6.9a8.16 8.16 0 0 0 5.46 2.05V7.38a4.77 4.77 0 0 1-3.41-1.12Z" />
  </svg>
);

type ApiApplicationRow = {
  id: string;
  athleteUserId?: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
  athleteSnapshot?: {
    name?: string;
    sport?: string;
    school?: string;
    image?: string;
    followers?: string;
    engagement?: string;
  };
};

function parseHumanCount(value: string): number {
  const raw = value.trim().toUpperCase();
  if (!raw) return 0;
  const multiplier = raw.endsWith('M') ? 1_000_000 : raw.endsWith('K') ? 1_000 : 1;
  const numeric = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric)) return 0;
  return numeric * multiplier;
}

function parseCurrencyAmount(value: string): number {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function BusinessOverview() {
  const router = useRouter();
  const { toggleAthlete, isAthleteSaved } = useSavedMarketplace();
  const { campaigns, isLoading: campaignsLoading } = useCampaignsList();
  const campaignRows = campaigns.slice(0, 3);
  const [campaignApplications, setCampaignApplications] = useState<ApiApplicationRow[]>([]);
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [dealsLoaded, setDealsLoaded] = useState(false);
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDealsLoaded(false);
    void (async () => {
      try {
        const rows = await fetchDealsList();
        if (!cancelled) setDeals(rows);
      } catch {
        if (!cancelled) setDeals([]);
      } finally {
        if (!cancelled) setDealsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setApplicationsLoaded(false);
    void (async () => {
      if (campaignsLoading) return;
      if (campaigns.length === 0) {
        setCampaignApplications([]);
        setApplicationsLoaded(true);
        return;
      }
      const results = await Promise.all(
        campaigns.map(async (campaign) => {
          try {
            const res = await authFetch(`/api/campaigns/${encodeURIComponent(String(campaign.id))}/applications`);
            if (!res.ok) return [] as ApiApplicationRow[];
            const data = (await res.json()) as { applications?: ApiApplicationRow[] };
            return Array.isArray(data.applications) ? data.applications : [];
          } catch {
            return [] as ApiApplicationRow[];
          }
        })
      );
      if (!cancelled) {
        setCampaignApplications(results.flat());
        setApplicationsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaigns, campaignsLoading]);

  const recommendedAthletes = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        sport: string;
        school: string;
        image: string;
        followersLabel: string;
        followersCount: number;
        engagementLabel: string;
        engagementPct: number;
        matchScore: number;
      }
    >();
    for (const app of campaignApplications) {
      const athleteId = String(app.athleteUserId ?? '').trim();
      if (!athleteId) continue;
      const snap = app.athleteSnapshot ?? {};
      const followersLabel = String(snap.followers ?? '').trim() || '—';
      const engagementLabel = String(snap.engagement ?? '').trim() || '—';
      const followersCount = parseHumanCount(followersLabel);
      const engagementPct = Number.parseFloat(engagementLabel.replace('%', '')) || 0;
      const status = String(app.status ?? '').toLowerCase();
      const statusWeight =
        status === 'shortlisted'
          ? 8
          : status === 'under_review'
            ? 6
            : status === 'applied'
              ? 4
              : status === 'offer_sent'
                ? 7
                : 3;
      const score = followersCount * 0.0005 + engagementPct * 5 + statusWeight;
      const previous = map.get(athleteId);
      if (!previous || score > previous.matchScore) {
        map.set(athleteId, {
          id: athleteId,
          name: String(snap.name ?? '').trim() || 'Athlete',
          sport: String(snap.sport ?? '').trim() || 'Sport not provided',
          school: String(snap.school ?? '').trim() || 'School not provided',
          image: String(snap.image ?? '').trim(),
          followersLabel,
          followersCount,
          engagementLabel,
          engagementPct,
          matchScore: score,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4);
  }, [campaignApplications]);

  const totalForecastSpend = useMemo(() => {
    if (deals.length > 0) {
      return deals.reduce((sum, deal) => sum + compensationAmountFromDealSnapshot(deal.termsSnapshot), 0);
    }
    return campaigns.reduce((sum, campaign) => {
      const raw = String((campaign.budgetHint ?? campaign.budget ?? '') as string);
      return sum + parseCurrencyAmount(raw);
    }, 0);
  }, [deals, campaigns]);

  const totalReach = useMemo(
    () => recommendedAthletes.reduce((sum, athlete) => sum + athlete.followersCount, 0),
    [recommendedAthletes]
  );

  const avgEngagement = useMemo(() => {
    if (recommendedAthletes.length === 0) return 0;
    const sum = recommendedAthletes.reduce((acc, athlete) => acc + athlete.engagementPct, 0);
    return sum / recommendedAthletes.length;
  }, [recommendedAthletes]);

  const activeCampaignCount = campaigns.filter((campaign) => {
    const status = String(campaign.status ?? '').toLowerCase();
    return status !== 'draft' && status !== 'archived' && status !== 'completed';
  }).length;

  const pipelineCounts = useMemo(() => {
    const counts = { outreach: 0, review: 0, negotiating: 0, active: 0, completed: 0 };
    for (const app of campaignApplications) {
      const status = String(app.status ?? '').toLowerCase();
      if (status === 'applied' || status === 'pending') counts.outreach += 1;
      else if (status === 'under_review') counts.review += 1;
      else if (status === 'shortlisted') counts.negotiating += 1;
      else if (status === 'offer_sent' || status === 'approved') counts.active += 1;
      else counts.completed += 1;
    }
    return counts;
  }, [campaignApplications]);

  const PIPELINE = [
    { label: 'Outreach', count: pipelineCounts.outreach, color: 'bg-gray-100' },
    { label: 'In Review', count: pipelineCounts.review, color: 'bg-gray-200/80' },
    { label: 'Negotiating', count: pipelineCounts.negotiating, color: 'bg-nilink-accent/15' },
    { label: 'Active', count: pipelineCounts.active, color: 'bg-nilink-accent/25' },
    { label: 'Completed', count: pipelineCounts.completed, color: 'bg-nilink-sidebar-muted/20' },
  ];
  const pipelineBarSegments = [
    { count: pipelineCounts.outreach, className: 'bg-gray-300' },
    { count: pipelineCounts.review, className: 'bg-gray-400/80' },
    { count: pipelineCounts.negotiating, className: 'bg-nilink-accent/50' },
    { count: pipelineCounts.active, className: 'bg-nilink-accent' },
    { count: pipelineCounts.completed, className: 'bg-nilink-sidebar-muted' },
  ];
  const totalDeals = Math.max(1, pipelineBarSegments.reduce((sum, segment) => sum + segment.count, 0));

  const kpiStats = [
    {
      label: 'Total NIL Spend',
      value: totalForecastSpend > 0 ? `$${Math.round(totalForecastSpend).toLocaleString()}` : '$0',
      sub: deals.length > 0 ? 'from live deals' : 'from active campaign budgets',
      icon: DollarSign,
      href: '/dashboard/deals',
    },
    {
      label: 'Active Campaigns',
      value: String(activeCampaignCount),
      sub: `${campaignApplications.length} total applications`,
      icon: Activity,
      href: '/dashboard/campaigns',
    },
    {
      label: 'Total Reach',
      value: totalReach > 0 ? formatCompactNumber(totalReach) : '—',
      sub: 'across tracked applicants',
      icon: BarChart3,
      href: '/dashboard/analytics',
    },
    {
      label: 'Avg Engagement',
      value: avgEngagement > 0 ? `${avgEngagement.toFixed(1)}%` : '—',
      sub: 'from applicant snapshots',
      icon: TrendingUp,
      href: '/dashboard/analytics',
    },
  ] as const;
  const isFirstTimeBusiness =
    campaigns.length === 0 && campaignApplications.length === 0 && deals.length === 0;
  const isWarmingUpBusiness =
    !isFirstTimeBusiness && campaigns.length > 0 && campaignApplications.length === 0 && deals.length === 0;
  const dashboardReady = !campaignsLoading && dealsLoaded && applicationsLoaded;

  if (!dashboardReady) {
    return (
      <div className="h-full flex flex-col bg-nilink-surface overflow-auto text-nilink-ink">
        <div className="dash-main-gutter-x mb-6 shrink-0 border-b border-gray-100 py-5">
          <DashboardPageHeader
            title="Dashboard"
            subtitle="Overview of your NIL programs and partnerships"
            animate
          />
        </div>
        <div className="dash-main-gutter-x">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-nilink-surface overflow-auto text-nilink-ink">
      {/* ── Title Area ── */}
      <div className="dash-main-gutter-x mb-6 shrink-0 border-b border-gray-100 py-5">
        <DashboardPageHeader
          title="Dashboard"
          subtitle="Overview of your NIL programs and partnerships"
          animate
        />
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="relative z-20 w-full flex-1 space-y-8 pb-8 dash-main-gutter-x">

        {/* ── KPI Strip ────────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {kpiStats.map(({ label, value, sub, icon: Icon, href }) => (
            <motion.div
              key={label}
              variants={staggerItem}
              role="button"
              tabIndex={0}
              onClick={() => router.push(href)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') router.push(href);
              }}
              className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <p
                className="text-4xl font-black leading-none text-nilink-ink mb-2"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {value}
              </p>
              <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-nilink-accent shrink-0" />
                {sub}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Deal Pipeline / first-time starter ────────────────────── */}
        {isFirstTimeBusiness ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">First Steps</p>
              <h2 className="mt-2 text-3xl tracking-wide text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Launch your first campaign
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Publish a campaign, attract athlete applications, and move them into offers and deals.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/campaigns')}
                  className="rounded-xl bg-nilink-accent px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-nilink-accent-hover"
                >
                  Create campaign
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/search')}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Find athletes
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Setup Checklist</p>
              <ul className="mt-3 space-y-3 text-sm text-gray-600">
                <li>1. Publish one public campaign.</li>
                <li>2. Review incoming applications.</li>
                <li>3. Send first offer to a shortlisted athlete.</li>
              </ul>
            </div>
          </div>
        ) : isWarmingUpBusiness ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Warming Up</p>
              <h2 className="mt-2 text-3xl tracking-wide text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Campaigns are live. Now attract your first applicants.
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Promote your campaign and shortlist candidates from Explore to begin offer and deal flow.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/campaigns')}
                  className="rounded-xl bg-nilink-accent px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-nilink-accent-hover"
                >
                  Open campaigns
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/search')}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Source athletes
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">What Unlocks Next</p>
              <ul className="mt-3 space-y-3 text-sm text-gray-600">
                <li>1. First application unlocks candidate pipeline.</li>
                <li>2. First offer unlocks deal tracking.</li>
                <li>3. First accepted offer unlocks payout simulation.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <motion.div
              layout
              role="button"
              tabIndex={0}
              onClick={() => router.push('/dashboard/deals')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/deals');
              }}
              className="w-full cursor-pointer bg-white rounded-xl border border-gray-200 p-6 outline-none"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-nilink-ink">Deal Pipeline</h2>
                  <p className="text-xs text-gray-500 font-medium">Track every deal from outreach to completion</p>
                </div>
              </div>

              <div className="flex items-stretch gap-2 mb-4">
                {PIPELINE.map(({ label, count, color }) => (
                  <div key={label} className="flex-1">
                    <div className={`w-full rounded-lg px-2 py-4 flex flex-col items-center gap-1 ${color}`}>
                      <span
                        className="text-3xl font-black leading-none text-nilink-ink"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                      >
                        {count}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-center leading-tight text-gray-600">
                        {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Proportional bar */}
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden flex">
                {pipelineBarSegments.map(({ count, className }, i) => (
                  <motion.div
                    key={i}
                    className={className}
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / totalDeals) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.05 }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-500 font-medium mt-2">{pipelineBarSegments.reduce((sum, s) => sum + s.count, 0)} total records tracked</p>
            </motion.div>
          </div>
        )}

        {/* ── Your campaigns (brand-owned) ─────────────────────────────── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-nilink-accent" strokeWidth={2.25} />
              <h2 className="text-xl font-bold text-nilink-ink">Your campaigns</h2>
            </div>
            <Link
              href="/dashboard/campaigns"
              className="text-sm font-semibold text-nilink-accent hover:text-nilink-accent-hover hover:underline"
            >
              Manage all
            </Link>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5">
            {campaignsLoading && (
              <p className="py-6 text-center text-sm text-gray-400">Loading your campaigns…</p>
            )}
            {!campaignsLoading && campaignRows.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-500 mb-3">No campaigns yet. Create one to start collecting applications.</p>
                <Link
                  href="/dashboard/campaigns"
                  className="inline-flex rounded-lg bg-nilink-accent px-4 py-2 text-sm font-semibold text-white hover:bg-nilink-accent-hover"
                >
                  Open Campaigns
                </Link>
              </div>
            )}
            {!campaignsLoading &&
              campaignRows.length > 0 &&
              campaignRows.map((c, i) => {
                const posted = formatCampaignRelativePosted(c.createdAt ?? null);
                const last = i === campaignRows.length - 1;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push('/dashboard/campaigns')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/campaigns');
                    }}
                    className={`flex cursor-pointer flex-col gap-1 py-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between ${!last ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-nilink-accent">{c.status}</span>
                        {posted ? (
                          <>
                            {' '}
                            · Posted {posted}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/campaigns"
                      className="shrink-0 text-sm font-semibold text-nilink-accent hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── Recommended Athletes ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-nilink-ink">Recommended for Your Brand</h2>
            <motion.button
              type="button"
              onClick={() => router.push('/dashboard/search')}
              className="px-4 py-1.5 bg-nilink-accent text-white text-sm font-semibold rounded-lg hover:bg-nilink-accent-hover transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              See All
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendedAthletes.length === 0 ? (
              <div className="md:col-span-2 lg:col-span-4 rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
                No athlete recommendations yet. Applications from your campaigns will appear here.
              </div>
            ) : recommendedAthletes.map((athlete, i) => (
              <motion.div
                key={athlete.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/profile/view?id=${athlete.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/dashboard/profile/view?id=${athlete.id}`);
                  }
                }}
                className="group cursor-pointer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                whileHover={{ y: -3 }}
              >
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                  <ImageWithFallback
                    src={athlete.image}
                    alt={athlete.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAthlete(athlete.id);
                    }}
                    title={isAthleteSaved(athlete.id) ? 'Remove from saved' : 'Save athlete'}
                    className={`absolute right-3 top-12 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors ${
                      isAthleteSaved(athlete.id)
                        ? 'bg-nilink-accent text-white'
                        : 'bg-white/95 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isAthleteSaved(athlete.id) ? 'fill-current' : ''}`} />
                  </button>
                  <div className="absolute top-3 right-3 bg-nilink-accent-soft px-2.5 py-1 rounded-full text-[10px] font-black text-nilink-accent uppercase tracking-wider shadow-md border border-nilink-accent-border flex items-center gap-1">
                    <Target className="w-2.5 h-2.5" />
                    {Math.max(60, Math.min(99, Math.round(athlete.matchScore)))}% Match
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-bold text-gray-900 group-hover:text-nilink-accent transition-colors">{athlete.name}</span>
                  <VerifiedBadge />
                </div>
                <p className="text-xs text-gray-500 mb-2 truncate">
                  {athlete.sport} | {athlete.school}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Instagram className="h-3.5 w-3.5 text-pink-600" /> {athlete.followersLabel}
                  </span>
                  <span className="flex items-center gap-1">
                    <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> {athlete.engagementLabel}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
