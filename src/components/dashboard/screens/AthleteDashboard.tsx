'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Calendar, Megaphone, Loader2, Handshake } from 'lucide-react';
import { motion } from 'framer-motion';
import { getBrandImageByName } from '@/lib/mockData';
import { staggerContainer, staggerItem } from '@/components/dashboard/dashboardMotion';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/authFetch';

export function AthleteDashboard() {
  const { user } = useDashboard();
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [pendingOffers, setPendingOffers] = useState<
    Array<{
      id: string;
      brandName: string;
      campaignName: string | null;
      compensationSummary: string;
      deadline: string | null;
      createdAt: string | null;
    }>
  >([]);
  const activeDeals = [
    {
      id: 1,
      brand: 'PowerFuel Energy',
      type: 'Social Media Campaign',
      value: '$2,500',
      deadline: 'Mar 15, 2026',
      status: 'active',
    },
    {
      id: 2,
      brand: 'Campus Threads',
      type: 'Product Endorsement',
      value: '$1,800',
      deadline: 'Mar 28, 2026',
      status: 'active',
    },
    {
      id: 3,
      brand: 'TechGear Pro',
      type: 'Event Appearance',
      value: '$3,200',
      deadline: 'Apr 5, 2026',
      status: 'active',
    },
  ];

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'there';
  const welcomeSubtitle = `Welcome back, ${firstName}. Here is your NIL activity.`;
  const pendingOfferCount = pendingOffers.length;

  const loadPendingOffers = useCallback(async () => {
    setOffersLoading(true);
    setOffersError(null);
    try {
      const res = await authFetch('/api/offers');
      const data = (await res.json()) as {
        offers?: Array<{
          id: string;
          brandName: string;
          campaignName: string | null;
          compensationSummary: string;
          deadline: string | null;
          createdAt: string | null;
          athleteOfferStatus?: string;
        }>;
        error?: string;
      };
      if (!res.ok) {
        setOffersError(data.error || 'Could not load pending offers');
        setPendingOffers([]);
        return;
      }
      const offers = Array.isArray(data.offers) ? data.offers : [];
      const pending = offers
        .filter((o) => o.athleteOfferStatus === 'pending')
        .map((o) => ({
          id: o.id,
          brandName: o.brandName,
          campaignName: o.campaignName ?? null,
          compensationSummary: o.compensationSummary,
          deadline: o.deadline ?? null,
          createdAt: o.createdAt ?? null,
        }));
      setPendingOffers(pending);
    } catch {
      setOffersError('Network error while loading pending offers');
      setPendingOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPendingOffers();
  }, [loadPendingOffers]);

  const pendingOfferPreview = useMemo(() => pendingOffers.slice(0, 3), [pendingOffers]);

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
          className="bg-nilink-sidebar rounded-2xl p-8 shadow-2xl relative overflow-hidden group"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-nilink-accent-bright/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150" />
          <h3 className="text-5xl font-black mb-2 text-white tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            $7,500
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Earnings</p>
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="bg-white border border-gray-100 hover:border-nilink-accent-bright/40 transition-all rounded-2xl p-8 shadow-sm group"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <h3 className="text-5xl font-black mb-2 text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            3
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-nilink-accent transition-colors">
            Active Deals
          </p>
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="bg-white border border-gray-100 hover:border-nilink-accent-bright/40 transition-all rounded-2xl p-8 shadow-sm group"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-5xl font-black text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              5
            </h3>
            <span className="w-3 h-3 rounded-full bg-nilink-accent animate-pulse" />
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-nilink-accent transition-colors">
            Unread Messages
          </p>
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="bg-white border border-gray-100 hover:border-nilink-accent-bright/40 transition-all rounded-2xl p-8 shadow-sm group flex flex-col justify-between"
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <div>
            <h3 className="text-5xl font-black mb-2 text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              85%
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-nilink-accent transition-colors">
              Profile Complete
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4 overflow-hidden">
            <motion.div
              className="bg-nilink-accent-bright h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '85%' }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
        </motion.div>
      </motion.div>

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
            <span className="text-sm font-bold text-nilink-accent transition-colors hover:text-nilink-ink">
              VIEW ALL
            </span>
          </div>
          <div className="flex flex-col">
            {activeDeals.map((deal, i) => (
              <motion.div
                key={deal.id}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                className={`flex items-center justify-between py-5 group ${i !== activeDeals.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex-1 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-white border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden mt-0.5">
                    <img src={getBrandImageByName(deal.brand)} alt="" className="w-full h-full object-cover" />
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
              <p className="text-sm text-red-700">
                {offersError}{' '}
                <button type="button" className="font-semibold underline" onClick={() => void loadPendingOffers()}>
                  Retry
                </button>
              </p>
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

      {/* Profile Completion */}
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
                  <CheckCircle2 className="w-5 h-5 text-nilink-accent-bright" />
                </div>
                <span className="text-white font-semibold text-sm">Basic Info</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-nilink-accent/25 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-nilink-accent-bright" />
                </div>
                <span className="text-white font-semibold text-sm">Socials</span>
              </div>
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-gray-600" />
                </div>
                <span className="text-white font-semibold text-sm">Achievements</span>
              </div>
            </div>
          </div>

          <div className="text-center shrink-0">
            <motion.button
              type="button"
              className="px-8 py-4 bg-nilink-accent text-white font-black uppercase tracking-widest text-sm hover:bg-nilink-accent-hover transition-colors rounded-xl shadow-xl"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              Finish Setup
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
