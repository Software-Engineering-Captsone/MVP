'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Calendar, Megaphone, Loader2, Handshake } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/components/dashboard/dashboardMotion';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { useOffersList } from '@/hooks/api/useOffersList';
import { useCampaignsList } from '@/hooks/api/useCampaignsList';
import { authFetch } from '@/lib/authFetch';
import { hydrateOnboardingDraft, loadOnboardingState } from '@/lib/onboardingHydrate';
import type { ChatInboxItem } from '@/lib/chat/types';

function parseCurrencyAmount(value: string): number {
  const numeric = value.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrencyAmount(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactDate(value: string | null | undefined): string {
  if (!value) return 'No deadline';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'No deadline';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AthleteDashboard() {
  const router = useRouter();
  const { user } = useDashboard();
  const { offers, isLoading: offersLoading, error: offersRawError } = useOffersList();
  const { campaigns, isLoading: campaignsLoading } = useCampaignsList();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [signalsLoaded, setSignalsLoaded] = useState(false);
  const pendingOffers = useMemo(
    () => offers.filter((o) => o.athleteOfferStatus === 'pending'),
    [offers]
  );
  const offersError = offersRawError?.message ?? null;

  const refreshDashboardSignals = useCallback(async () => {
    setSignalsLoaded(false);
    try {
      const inboxRes = await authFetch('/api/chat/inbox');
      if (inboxRes.ok) {
        const inboxData = (await inboxRes.json()) as { items?: ChatInboxItem[] };
        const unread = (inboxData.items ?? []).reduce((sum, item) => sum + (item.unreadCount || 0), 0);
        setUnreadMessages(unread);
      }
    } catch {
      setUnreadMessages(0);
    }

    try {
      const state = await loadOnboardingState();
      const draft = hydrateOnboardingDraft(state);
      const checks = [
        Boolean(draft.basics.fullName?.trim()),
        draft.athletic.sports.length > 0,
        Boolean(draft.academic.school?.trim()) && Boolean(draft.academic.schoolEmail?.trim()),
        draft.compliance.schoolEmailVerified === true,
        Boolean(draft.profile.bio?.trim()) || Boolean(draft.profile.profilePictureUrl?.trim()),
      ];
      const complete = checks.filter(Boolean).length;
      setProfileCompletion(Math.round((complete / checks.length) * 100));
    } catch {
      setProfileCompletion(0);
    } finally {
      setSignalsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshDashboardSignals();
  }, [refreshDashboardSignals]);

  const activeDeals = useMemo(
    () =>
      offers
        .filter(
          (o) =>
            (o.dealId && o.dealId.trim().length > 0 && o.athleteOfferStatus !== 'declined' && o.athleteOfferStatus !== 'expired') ||
            o.athleteOfferStatus === 'accepted'
        )
        .map((o) => ({
          id: o.id,
          brand: o.brandName || 'Brand',
          type: o.campaignName || 'Direct collaboration',
          value: o.compensationSummary || 'Compensation in offer',
          deadline: formatCompactDate(o.deadline),
          dealId: o.dealId ?? null,
        })),
    [offers]
  );

  const totalEarnings = useMemo(
    () =>
      offers
        .filter((o) => o.athleteOfferStatus === 'accepted')
        .reduce((sum, o) => sum + parseCurrencyAmount(o.compensationSummary || ''), 0),
    [offers]
  );

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'there';
  const welcomeSubtitle = `Welcome back, ${firstName}. Here is your NIL activity.`;
  const pendingOfferCount = pendingOffers.length;
  const pendingOfferPreview = useMemo(() => pendingOffers.slice(0, 3), [pendingOffers]);
  const opportunityPreview = useMemo(() => campaigns.slice(0, 3), [campaigns]);
  const dashboardReady = signalsLoaded && !offersLoading && !campaignsLoading;

  const athleteDashboardState = useMemo<'first_time' | 'warming_up' | 'active'>(() => {
    if (!dashboardReady) return 'first_time';
    const hasLiveWork = activeDeals.length > 0 || pendingOfferCount > 0 || unreadMessages > 0;
    if (hasLiveWork) return 'active';
    if (profileCompletion < 70) return 'first_time';
    return 'warming_up';
  }, [dashboardReady, activeDeals.length, pendingOfferCount, unreadMessages, profileCompletion]);

  if (!dashboardReady) {
    return (
      <div className="dash-main-gutter-x min-h-full bg-nilink-page pb-8 pt-5 font-sans text-nilink-ink md:pb-10 md:pt-6">
        <DashboardPageHeader
          title="Dashboard"
          subtitle={welcomeSubtitle}
          className="mb-8"
          animate
        />
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-main-gutter-x min-h-full bg-nilink-page pb-8 pt-5 font-sans text-nilink-ink md:pb-10 md:pt-6">
      <DashboardPageHeader
        title="Dashboard"
        subtitle={welcomeSubtitle}
        className="mb-8"
        animate
      />

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-16"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={staggerItem}
          role="button"
          tabIndex={0}
          onClick={() => router.push('/dashboard/deals')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/deals');
          }}
          className="bg-nilink-sidebar rounded-2xl p-8 shadow-2xl relative overflow-hidden group cursor-pointer"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-nilink-accent-bright/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150" />
          <h3 className="text-5xl font-black mb-2 text-white tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {formatCurrencyAmount(totalEarnings)}
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Earnings</p>
        </motion.div>

        <motion.div
          variants={staggerItem}
          role="button"
          tabIndex={0}
          onClick={() => router.push('/dashboard/deals')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/deals');
          }}
          className="bg-white border border-gray-100 hover:border-nilink-accent-bright/40 transition-all rounded-2xl p-8 shadow-sm group cursor-pointer"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <h3 className="text-5xl font-black mb-2 text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {activeDeals.length}
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-nilink-accent transition-colors">
            Active Deals
          </p>
        </motion.div>

        <motion.div
          variants={staggerItem}
          role="button"
          tabIndex={0}
          onClick={() => router.push('/dashboard/messages')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/messages');
          }}
          className="bg-white border border-gray-100 hover:border-nilink-accent-bright/40 transition-all rounded-2xl p-8 shadow-sm group cursor-pointer"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-5xl font-black text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {unreadMessages}
            </h3>
            {unreadMessages > 0 ? <span className="w-3 h-3 rounded-full bg-nilink-accent animate-pulse" /> : null}
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-nilink-accent transition-colors">
            Unread Messages
          </p>
        </motion.div>

        <motion.div
          variants={staggerItem}
          role="button"
          tabIndex={0}
          onClick={() => router.push('/dashboard/profile')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/profile');
          }}
          className="bg-white border border-gray-100 hover:border-nilink-accent-bright/40 transition-all rounded-2xl p-8 shadow-sm group flex cursor-pointer flex-col justify-between"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <div>
            <h3 className="text-5xl font-black mb-2 text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {profileCompletion}%
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-nilink-accent transition-colors">
              Profile Complete
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4 overflow-hidden">
            <motion.div
              className="bg-nilink-accent-bright h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${profileCompletion}%` }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
        </motion.div>
      </motion.div>

      {athleteDashboardState === 'first_time' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Get Started</p>
            <h2 className="mt-2 text-3xl tracking-wide text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Start your first NIL opportunity flow
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Discover open campaigns, complete your profile, and respond to incoming offers from one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/search')}
                className="rounded-xl bg-nilink-accent px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-nilink-accent-hover"
              >
                Explore campaigns
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/profile')}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50"
              >
                Complete profile
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/offers')}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50"
              >
                Check offers
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Recommended Next</p>
            <ul className="mt-3 space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-nilink-accent" />
                Add your sport, school, and bio for better campaign matching.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-nilink-accent" />
                Apply to one campaign to start your application pipeline.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-nilink-accent" />
                Keep inbox notifications on so brand replies are not missed.
              </li>
            </ul>
          </div>
        </div>
      ) : athleteDashboardState === 'warming_up' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2
                className="text-3xl tracking-wide text-nilink-ink"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                Recommended Opportunities
              </h2>
              <Link href="/dashboard/search" className="text-sm font-semibold text-nilink-accent hover:underline">
                See all
              </Link>
            </div>
            {campaignsLoading ? (
              <p className="py-4 text-sm text-gray-500">Loading opportunities…</p>
            ) : opportunityPreview.length === 0 ? (
              <p className="py-4 text-sm text-gray-500">No open campaigns yet. Check back soon.</p>
            ) : (
              <div className="space-y-3">
                {opportunityPreview.map((campaign) => (
                  <Link
                    key={String(campaign.id)}
                    href="/dashboard/search"
                    className="block rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <p className="truncate text-sm font-bold text-gray-900">{String(campaign.name ?? 'Campaign')}</p>
                    <p className="truncate text-xs text-gray-500">
                      {String(campaign.brandDisplayName ?? 'Brand')} · {String(campaign.sport ?? 'Sport')}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {String(campaign.budgetHint ?? campaign.budget ?? 'Compensation in details')}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Keep Momentum</p>
            <ul className="mt-3 space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-nilink-accent" />
                Apply to 1-2 campaigns this week to activate your pipeline.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-nilink-accent" />
                Keep profile details fresh to improve campaign matching.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-nilink-accent" />
                Watch offers and inbox for brand responses.
              </li>
            </ul>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Active Deals */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <h2
              className="text-3xl tracking-wide leading-tight text-nilink-ink"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              ACTIVE DEALS
            </h2>
            <Link href="/dashboard/deals" className="text-sm font-bold text-nilink-accent transition-colors hover:text-nilink-ink">
              VIEW ALL
            </Link>
          </div>
          <div className="flex flex-col">
            {activeDeals.length === 0 ? (
              <p className="py-4 text-sm text-gray-500">No active deals yet. Accepted offers will appear here.</p>
            ) : activeDeals.map((deal, i) => (
              <motion.div
                key={deal.id}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                role="button"
                tabIndex={0}
                onClick={() => router.push('/dashboard/deals')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/deals');
                }}
                className={`group flex cursor-pointer items-center justify-between py-5 ${i !== activeDeals.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex-1 flex items-start gap-4">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    <Handshake className="h-4 w-4 text-nilink-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-nilink-accent transition-colors">{deal.brand}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500 font-medium">{deal.type}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{deal.deadline}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-nilink-ink">{deal.value}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-nilink-accent-soft text-nilink-accent">
                  <Handshake className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-black tracking-wide text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    PENDING OFFERS
                  </h2>
                  <p className="text-xs text-gray-500">Decisions waiting on you</p>
                </div>
              </div>
              <span className="rounded-full bg-nilink-accent-soft px-2.5 py-1 text-xs font-bold text-nilink-accent">
                {pendingOfferCount}
              </span>
            </div>

            {offersLoading ? (
              <div className="flex items-center py-5 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading pending offers...
              </div>
            ) : offersError ? (
              <p className="text-sm text-red-700">{offersError}</p>
            ) : pendingOfferPreview.length === 0 ? (
              <p className="py-5 text-sm text-gray-500">No pending offers right now.</p>
            ) : (
              <div className="space-y-3">
                {pendingOfferPreview.map((offer) => (
                  <Link
                    key={offer.id}
                    href={`/dashboard/offers?offer=${encodeURIComponent(offer.id)}`}
                    className="block rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <p className="truncate text-sm font-bold text-gray-900">{offer.brandName}</p>
                    <p className="truncate text-xs text-gray-500">{offer.campaignName || 'Direct offer'}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{offer.compensationSummary}</span>
                      <span>{offer.deadline || offer.createdAt || '—'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/dashboard/offers"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-nilink-accent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-nilink-accent-hover"
            >
              Open offers center
            </Link>
          </div>

          {/* Campaigns live under Campaigns in the nav — keep home focused on deals & profile */}
          <div className="flex flex-col justify-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-nilink-accent-soft text-nilink-accent">
              <Megaphone className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <h2
              className="mb-2 text-3xl tracking-wide text-nilink-ink"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              BRAND CAMPAIGNS
            </h2>
            <p className="mb-6 text-sm font-medium text-gray-500">
              Browse open brand deals and submit your application in one place. Creating and managing campaigns is for brand
              accounts only.
            </p>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex w-fit items-center justify-center rounded-xl bg-nilink-accent px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-nilink-accent-hover"
            >
              Browse open campaigns
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Profile Completion */}
      {profileCompletion < 100 && athleteDashboardState === 'first_time' ? (
        <motion.div
          className="mt-16 bg-nilink-sidebar rounded-2xl p-10 overflow-hidden relative"
          layout
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-nilink-accent-bright/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-xl">
              <h2
                className="text-4xl mb-2 tracking-wide leading-tight text-white"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                COMPLETE YOUR PROFILE
              </h2>
              <p className="text-gray-400 text-sm font-medium mb-8">
                Want more sponsorship offers? Athletes with 100% complete profiles get 3x more brand reach.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-nilink-accent/25 flex items-center justify-center">
                    <CheckCircle2 className={`w-5 h-5 ${profileCompletion >= 20 ? 'text-nilink-accent-bright' : 'text-gray-500'}`} />
                  </div>
                  <span className="text-white font-semibold text-sm">Basic Info</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-nilink-accent/25 flex items-center justify-center">
                    <CheckCircle2 className={`w-5 h-5 ${profileCompletion >= 60 ? 'text-nilink-accent-bright' : 'text-gray-500'}`} />
                  </div>
                  <span className="text-white font-semibold text-sm">Sports + School</span>
                </div>
                <div className={`flex items-center gap-3 ${profileCompletion >= 100 ? '' : 'opacity-70'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${profileCompletion >= 100 ? 'bg-nilink-accent/25' : 'border-2 border-gray-600'}`}>
                    {profileCompletion >= 100 ? <CheckCircle2 className="w-5 h-5 text-nilink-accent-bright" /> : <span className="w-2 h-2 rounded-full bg-gray-600" />}
                  </div>
                  <span className="text-white font-semibold text-sm">Verification + Bio</span>
                </div>
              </div>
            </div>

            <div className="text-center shrink-0">
              <motion.button
                type="button"
                className="px-8 py-4 bg-nilink-accent text-white font-black uppercase tracking-widest text-sm hover:bg-nilink-accent-hover transition-colors rounded-xl shadow-xl"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard/profile')}
              >
                Finish Setup
              </motion.button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
