'use client';

import { useRouter } from 'next/navigation';
import {
  TrendingUp, Target, Users, ArrowRight,
  Activity, Bookmark, ChevronRight,
  DollarSign, BarChart3, ArrowUpRight,
} from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

interface Athlete {
  id: number;
  name: string;
  sport: string;
  school: string;
  profileImage: string;
  followers: number;
  engagementRate: number;
  compatibilityScore: number;
  priceRange: string;
  verified: boolean;
}

const KPI_STATS = [
  { label: 'Total NIL Spend',  value: '$24,500', sub: '+12% this month',   icon: DollarSign, accent: true  },
  { label: 'Active Campaigns', value: '4',        sub: '1 pending review',  icon: Activity,   accent: false },
  { label: 'Total Reach',      value: '2.1M',     sub: 'across all deals',  icon: BarChart3,  accent: false },
  { label: 'Avg Engagement',   value: '9.3%',     sub: 'industry avg 4.2%', icon: TrendingUp, accent: false },
];

const PIPELINE = [
  { label: 'Outreach',    count: 3,  color: 'bg-gray-100 text-gray-600'       },
  { label: 'In Review',   count: 2,  color: 'bg-blue-100 text-blue-700'       },
  { label: 'Negotiating', count: 1,  color: 'bg-amber-100 text-amber-700'     },
  { label: 'Active',      count: 4,  color: 'bg-[#6CC3DA]/20 text-[#2a96b5]' },
  { label: 'Completed',   count: 12, color: 'bg-green-100 text-green-700'     },
];

const BUDGET = { total: 10000, spent: 6200 };

const recommendedAthletes: Athlete[] = [
  {
    id: 1, name: 'Marcus Johnson', sport: 'Basketball', school: 'State University',
    profileImage: 'https://images.unsplash.com/photo-1590156532211-69280532a54a?w=400',
    followers: 37900, engagementRate: 8.5, compatibilityScore: 94, priceRange: '$500–$2,000', verified: true,
  },
  {
    id: 8, name: 'Maya Thompson', sport: 'Gymnastics', school: 'Elite Institute',
    profileImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    followers: 51300, engagementRate: 11.2, compatibilityScore: 96, priceRange: '$1,000–$4,000', verified: true,
  },
  {
    id: 6, name: 'Aisha Patel', sport: 'Tennis', school: 'Coastal Academy',
    profileImage: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400',
    followers: 32100, engagementRate: 8.8, compatibilityScore: 92, priceRange: '$600–$2,500', verified: false,
  },
  {
    id: 3, name: 'Tyler Washington', sport: 'Football', school: 'Central College',
    profileImage: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400',
    followers: 45200, engagementRate: 7.8, compatibilityScore: 91, priceRange: '$800–$3,000', verified: true,
  },
];

export function BusinessOverview() {
  const router = useRouter();
  const budgetPct = Math.round((BUDGET.spent / BUDGET.total) * 100);

  return (
    <div className="h-full flex flex-col bg-[#F4F6F9] overflow-auto font-sans">

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-8 py-10 relative z-20 space-y-6">

        {/* ── KPI Strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_STATS.map(({ label, value, sub, icon: Icon, accent }) => (
            <div
              key={label}
              className={`rounded-2xl p-5 border flex flex-col gap-3 shadow-md shadow-black/[0.05] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-default
                ${accent
                  ? 'bg-[#0F172A] border-[#0F172A]'
                  : 'bg-white border-gray-100'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                  ${accent ? 'bg-[#6CC3DA]/15 text-[#6CC3DA]' : 'bg-gray-50 text-[#6CC3DA] border border-gray-100'}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p
                className={`text-4xl font-black leading-none ${accent ? 'text-white' : 'text-[#0F172A]'}`}
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {value}
              </p>
              <p className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-[#6CC3DA] shrink-0" />
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Deal Pipeline + Budget ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Pipeline — 3 cols */}
          <div
            className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-md shadow-black/[0.04] p-6 cursor-pointer hover:border-[#6CC3DA]/30 hover:shadow-lg transition-all duration-200 group"
            onClick={() => router.push('/dashboard/deals')}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="text-xl font-black text-[#0F172A] leading-none mb-0.5"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Deal Pipeline
                </h3>
                <p className="text-xs text-gray-400 font-medium">Track every deal from outreach to completion</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#6CC3DA] group-hover:translate-x-1 transition-all" />
            </div>

            <div className="flex items-stretch gap-2 mb-4">
              {PIPELINE.map(({ label, count, color }) => (
                <div key={label} className="flex-1">
                  <div className={`w-full rounded-xl px-2 py-3.5 flex flex-col items-center gap-1 ${color}`}>
                    <span
                      className="text-2xl font-black leading-none"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {count}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-center leading-tight opacity-80">
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Proportional bar */}
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden flex">
              <div className="bg-gray-300" style={{ width: `${(3/22)*100}%` }} />
              <div className="bg-blue-300"  style={{ width: `${(2/22)*100}%` }} />
              <div className="bg-amber-300" style={{ width: `${(1/22)*100}%` }} />
              <div className="bg-[#6CC3DA]" style={{ width: `${(4/22)*100}%` }} />
              <div className="bg-green-400" style={{ width: `${(12/22)*100}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-1.5">22 total deals tracked</p>
          </div>

          {/* Budget — 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-md shadow-black/[0.04] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="text-xl font-black text-[#0F172A] leading-none mb-0.5"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Monthly Budget
                </h3>
                <p className="text-xs text-gray-400 font-medium">March 2026</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#6CC3DA]" />
              </div>
            </div>

            <div className="flex items-end justify-between mb-3">
              <div>
                <p
                  className="text-4xl font-black text-[#0F172A] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  ${BUDGET.spent.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">of ${BUDGET.total.toLocaleString()} used</p>
              </div>
              <p
                className="text-3xl font-black text-[#6CC3DA]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {budgetPct}%
              </p>
            </div>

            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6CC3DA] to-[#4ab0cc]"
                style={{ width: `${budgetPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold mt-auto">
              <span className="flex items-center gap-1.5 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-[#6CC3DA]" /> Spent
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-200" />
                Remaining: ${(BUDGET.total - BUDGET.spent).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Recommended Athletes ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4 bg-white px-6 py-4 rounded-2xl shadow-md shadow-black/[0.04] border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-1 h-9 rounded-full bg-gradient-to-b from-[#6CC3DA] to-[#6CC3DA]/20" />
              <div>
                <div className="flex items-center gap-3 mb-0.5">
                  <h2
                    className="text-2xl font-black text-[#0F172A] leading-none"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    Recommended for Your Brand
                  </h2>
                  <span className="hidden md:inline-flex items-center gap-1.5 bg-[#6CC3DA]/10 border border-[#6CC3DA]/20 text-[#3aa8c5] text-[10px] font-bold tracking-widest uppercase rounded-full px-2.5 py-1">
                    <Target className="w-3 h-3" />
                    93% avg match
                  </span>
                </div>
                <p className="text-gray-400 text-xs font-medium">Athletes with high compatibility based on your industry and goals.</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/search')}
              className="text-[#0F172A] font-bold uppercase tracking-widest text-[11px] hover:text-[#6CC3DA] transition-colors flex items-center gap-1.5 shrink-0"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendedAthletes.map((athlete) => (
              <div
                key={athlete.id}
                onClick={() => router.push('/dashboard/search')}
                className="bg-white rounded-2xl shadow-md shadow-black/[0.06] border border-gray-100 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col"
              >
                <div className="h-56 relative overflow-hidden bg-gray-100">
                  <ImageWithFallback
                    src={athlete.profileImage}
                    alt={athlete.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-300" />

                  <div className="absolute top-3 right-3 bg-[#6CC3DA] px-2.5 py-1 rounded-full text-[10px] font-black text-[#0F172A] uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Target className="w-2.5 h-2.5" />
                    {athlete.compatibilityScore}% Match
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3
                        className="text-xl font-black text-white leading-tight uppercase"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                      >
                        {athlete.name}
                      </h3>
                      {athlete.verified && (
                        <VerifiedBadge className="w-3.5 h-3.5 text-[#6CC3DA] drop-shadow shrink-0" />
                      )}
                    </div>
                    <p className="text-[#6CC3DA] text-[11px] font-bold tracking-wide">
                      {athlete.sport}
                      <span className="text-gray-500 mx-1">·</span>
                      <span className="text-gray-300 font-medium">{athlete.school}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 group-hover:border-[#6CC3DA]/20 transition-colors">
                      <p className="text-[9px] text-gray-400 font-black mb-1 uppercase tracking-widest">Followers</p>
                      <p className="text-base font-black text-[#0F172A] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#6CC3DA]" />
                        {(athlete.followers / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <div className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 group-hover:border-[#6CC3DA]/20 transition-colors">
                      <p className="text-[9px] text-gray-400 font-black mb-1 uppercase tracking-widest">Engagement</p>
                      <p className="text-base font-black text-[#0F172A] flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-[#6CC3DA]" />
                        {athlete.engagementRate}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Price Range</p>
                      <p className="text-xs font-bold text-[#0F172A]">{athlete.priceRange}</p>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center group-hover:bg-[#6CC3DA] group-hover:text-[#0F172A] transition-colors shadow-md">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">

          {/* Active Campaigns */}
          <div
            onClick={() => router.push('/dashboard/campaigns')}
            className="bg-[#0F172A] rounded-2xl shadow-xl overflow-hidden group cursor-pointer relative"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#6CC3DA]/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-125 transition-all duration-700 pointer-events-none" />
            <div className="relative z-10 p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-[#6CC3DA]/10 border border-[#6CC3DA]/20 rounded-xl flex items-center justify-center group-hover:bg-[#6CC3DA]/20 transition-all duration-300">
                    <Activity className="w-5 h-5 text-[#6CC3DA]" />
                  </div>
                  <div>
                    <h4
                      className="text-xl font-black text-white leading-none mb-0.5"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      Active Campaigns
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium">Real-time performance</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all mt-0.5" />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[['3','Running'],['1','Pending'],['87%','Avg Reach']].map(([val, lbl]) => (
                  <div key={lbl} className="bg-white/5 border border-white/[0.07] rounded-xl px-3 py-3 group-hover:border-white/[0.12] transition-colors">
                    <p
                      className="text-3xl font-black text-white leading-none mb-1"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >{val}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Saved Athletes */}
          <div
            onClick={() => router.push('/dashboard/saved')}
            className="bg-white rounded-2xl shadow-lg shadow-black/[0.05] border border-gray-100 group cursor-pointer hover:border-[#6CC3DA]/30 hover:shadow-xl transition-all duration-300 overflow-hidden relative"
          >
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#6CC3DA]/5 rounded-full blur-3xl translate-x-10 translate-y-10 group-hover:scale-125 transition-all duration-700 pointer-events-none" />
            <div className="relative z-10 p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center group-hover:bg-[#6CC3DA]/10 group-hover:border-[#6CC3DA]/25 transition-all duration-300">
                    <Bookmark className="w-5 h-5 text-[#0F172A] group-hover:text-[#3aa8c5] transition-colors" />
                  </div>
                  <div>
                    <h4
                      className="text-xl font-black text-[#0F172A] leading-none mb-0.5"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      Saved Athletes
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium">Shortlisted for future deals</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0F172A] group-hover:translate-x-1 transition-all mt-0.5" />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[['12','Total'],['4','Basketball'],['5','Football']].map(([val, lbl]) => (
                  <div key={lbl} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 group-hover:border-[#6CC3DA]/20 transition-colors">
                    <p
                      className="text-3xl font-black text-[#0F172A] leading-none mb-1"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >{val}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
