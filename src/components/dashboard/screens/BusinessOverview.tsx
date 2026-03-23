'use client';

import { useRouter } from 'next/navigation';
import {
  TrendingUp, Target,
  Activity, ChevronRight,
  DollarSign, BarChart3, ArrowUpRight, Instagram, Facebook, Heart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { mockAthletes } from '@/lib/mockData';
import { staggerContainer, staggerItem } from '@/components/dashboard/dashboardMotion';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useSavedMarketplace } from '@/hooks/useSavedMarketplace';

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68a6.34 6.34 0 0 0 6.27 6.36 6.34 6.34 0 0 0 6.27-6.36v-6.9a8.16 8.16 0 0 0 5.46 2.05V7.38a4.77 4.77 0 0 1-3.41-1.12Z" />
  </svg>
);

const KPI_STATS = [
  { label: 'Total NIL Spend',  value: '$24,500', sub: '+12% this month',   icon: DollarSign, accent: true  },
  { label: 'Active Campaigns', value: '4',        sub: '1 pending review',  icon: Activity,   accent: false },
  { label: 'Total Reach',      value: '2.1M',     sub: 'across all deals',  icon: BarChart3,  accent: false },
  { label: 'Avg Engagement',   value: '9.3%',     sub: 'industry avg 4.2%', icon: TrendingUp, accent: false },
];

/** Pipeline stages — tonal neutrals + accent tint (aligned with sidebar palette) */
const PIPELINE = [
  { label: 'Outreach',    count: 3,  color: 'bg-gray-100' },
  { label: 'In Review',   count: 2,  color: 'bg-gray-200/80' },
  { label: 'Negotiating', count: 1,  color: 'bg-nilink-accent/15' },
  { label: 'Active',      count: 4,  color: 'bg-nilink-accent/25' },
  { label: 'Completed',   count: 12, color: 'bg-nilink-sidebar-muted/20' },
];

const pipelineBarSegments = [
  { count: 3,  className: 'bg-gray-300' },
  { count: 2,  className: 'bg-gray-400/80' },
  { count: 1,  className: 'bg-nilink-accent/50' },
  { count: 4,  className: 'bg-nilink-accent' },
  { count: 12, className: 'bg-nilink-sidebar-muted' },
];

export function BusinessOverview() {
  const router = useRouter();
  const { toggleAthlete, isAthleteSaved } = useSavedMarketplace();
  const totalDeals = pipelineBarSegments.reduce((s, x) => s + x.count, 0);

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
          {KPI_STATS.map(({ label, value, sub, icon: Icon }) => (
            <motion.div
              key={label}
              variants={staggerItem}
              className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-colors"
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

        {/* ── Deal Pipeline ────────────────────────────────────── */}
        <div>
          <motion.div
            layout
            className="w-full bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:border-gray-300 transition-all duration-200 group"
            onClick={() => router.push('/dashboard/deals')}
            whileHover={{ scale: 1.002 }}
            transition={{ type: 'spring', stiffness: 420, damping: 35 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="text-2xl font-black text-nilink-ink leading-none mb-1"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Deal Pipeline
                </h3>
                <p className="text-xs text-gray-500 font-medium">Track every deal from outreach to completion</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
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
            <p className="text-[10px] text-gray-500 font-medium mt-2">{totalDeals} total deals tracked</p>
          </motion.div>
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
            {mockAthletes.slice(0, 4).map((athlete, i) => (
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
                    {98 - parseInt(athlete.id, 10)}% Match
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-bold text-gray-900 group-hover:text-nilink-accent transition-colors">{athlete.name}</span>
                  {athlete.verified && <VerifiedBadge />}
                </div>
                <p className="text-xs text-gray-500 mb-2 truncate">
                  {athlete.sport} | {athlete.school}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                  <span className="flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> {athlete.stats.instagram}</span>
                  <span className="flex items-center gap-1"><TiktokIcon className="w-3.5 h-3.5" /> {athlete.stats.tiktok}</span>
                  <span className="flex items-center gap-1"><Facebook className="w-3.5 h-3.5" /> {athlete.stats.facebook}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
