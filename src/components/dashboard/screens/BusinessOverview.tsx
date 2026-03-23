'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, TrendingUp, MapPin, Target, Users, ArrowRight,
  Trophy, Zap, Sparkles, Flame, Activity, Bookmark, ChevronRight,
  DollarSign, BarChart3, ArrowUpRight, CircleDot,
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

const CATEGORIES = [
  { label: 'Basketball',      icon: Trophy     },
  { label: 'Football',        icon: Zap        },
  { label: 'High Engagement', icon: TrendingUp },
  { label: 'Local to Texas',  icon: MapPin     },
  { label: 'Female Athletes', icon: Sparkles   },
  { label: 'Top Rising',      icon: Flame      },
];

const KPI_STATS = [
  { label: 'Total NIL Spend',    value: '$24,500', sub: '+12% this month',  icon: DollarSign, accent: true  },
  { label: 'Active Campaigns',   value: '4',       sub: '1 pending review', icon: Activity,   accent: false },
  { label: 'Total Reach',        value: '2.1M',    sub: 'across all deals', icon: BarChart3,  accent: false },
  { label: 'Avg Engagement',     value: '9.3%',    sub: 'industry avg 4.2%',icon: TrendingUp, accent: false },
];

const PIPELINE = [
  { label: 'Outreach',    count: 3, color: 'bg-gray-200 text-gray-600'          },
  { label: 'In Review',   count: 2, color: 'bg-blue-100 text-blue-700'          },
  { label: 'Negotiating', count: 1, color: 'bg-amber-100 text-amber-700'        },
  { label: 'Active',      count: 4, color: 'bg-[#6CC3DA]/20 text-[#2a96b5]'    },
  { label: 'Completed',   count: 12, color: 'bg-green-100 text-green-700'       },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const budgetPct = Math.round((BUDGET.spent / BUDGET.total) * 100);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    router.push(`/dashboard/search${params.toString() ? `?${params}` : ''}`);
  };

  const handleCategory = (label: string) => {
    const next = activeCategory === label ? null : label;
    setActiveCategory(next);
    if (next) router.push(`/dashboard/search?filter=${encodeURIComponent(next)}`);
  };

  return (
    <div className="h-full flex flex-col bg-[#F4F6F9] overflow-auto font-sans">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-[#0F172A] text-white pt-16 pb-28 px-8 overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 pointer-events-none">
          <div className="w-[700px] h-[700px] bg-[#6CC3DA] rounded-full mix-blend-screen filter blur-[160px] opacity-[0.15]" />
        </div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 pointer-events-none">
          <div className="w-[400px] h-[400px] bg-[#6CC3DA] rounded-full mix-blend-screen filter blur-[120px] opacity-[0.07]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-1.5 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#6CC3DA] animate-pulse" />
            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Brand Dashboard</span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-black tracking-normal uppercase mb-4 leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Welcome back,{' '}
            <span className="text-[#6CC3DA] relative">
              PowerFuel Energy
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6CC3DA] to-transparent rounded-full opacity-50" />
            </span>
          </h1>

          <p className="text-gray-400 text-base md:text-lg mb-10 max-w-xl mx-auto font-medium tracking-wide leading-relaxed">
            Discover the perfect athlete partners to elevate your brand's reach and engagement.
          </p>

          {/* Search */}
          <div className="bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/10 max-w-3xl mx-auto flex items-center hover:border-white/20 transition-all shadow-2xl">
            <Search className="w-5 h-5 text-gray-500 ml-5 mr-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search athletes by name, sport, or school..."
              className="flex-1 bg-transparent border-none text-white text-base placeholder-gray-600 font-medium focus:outline-none focus:ring-0 px-2 py-3.5"
            />
            <button
              onClick={handleSearch}
              className="bg-[#6CC3DA] hover:bg-white hover:text-[#0F172A] text-[#0F172A] font-black tracking-widest uppercase py-3.5 px-8 rounded-xl transition-all shadow-[0_0_24px_rgba(108,195,218,0.35)] flex items-center gap-2 text-sm"
            >
              Find <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {CATEGORIES.map(({ label, icon: Icon }) => {
              const isActive = activeCategory === label;
              return (
                <button
                  key={label}
                  onClick={() => handleCategory(label)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2.5 transition-all duration-200
                    ${isActive
                      ? 'bg-[#6CC3DA] text-[#0F172A] border border-[#6CC3DA] shadow-[0_0_16px_rgba(108,195,218,0.4)]'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20'}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-8 py-10 -mt-14 relative z-20 space-y-8">

        {/* ── KPI Strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_STATS.map(({ label, value, sub, icon: Icon, accent }) => (
            <div
              key={label}
              className={`rounded-2xl p-5 border flex flex-col gap-3 shadow-md shadow-black/[0.05] transition-all hover:-translate-y-0.5 hover:shadow-lg
                ${accent
                  ? 'bg-[#0F172A] border-[#0F172A] text-white'
                  : 'bg-white border-gray-100 text-[#0F172A]'}`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs font-bold uppercase tracking-widest ${accent ? 'text-gray-400' : 'text-gray-400'}`}>{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? 'bg-[#6CC3DA]/15 text-[#6CC3DA]' : 'bg-gray-50 text-[#6CC3DA] border border-gray-100'}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{value}</p>
              <p className={`text-xs font-medium flex items-center gap-1 ${accent ? 'text-gray-400' : 'text-gray-400'}`}>
                <ArrowUpRight className="w-3 h-3 text-[#6CC3DA]" />
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Deal Pipeline + Budget ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Pipeline — takes 3 cols */}
          <div
            className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-md shadow-black/[0.04] p-6 cursor-pointer hover:border-[#6CC3DA]/30 hover:shadow-lg transition-all group"
            onClick={() => router.push('/dashboard/deals')}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Deal Pipeline</h3>
                <p className="text-xs text-gray-400 font-medium">Track every deal from outreach to completion</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#6CC3DA] group-hover:translate-x-1 transition-all" />
            </div>

            <div className="flex items-stretch gap-2">
              {PIPELINE.map((stage, i) => (
                <div key={stage.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className={`w-full rounded-xl px-2 py-3 flex flex-col items-center gap-1 ${stage.color}`}>
                    <span className="text-2xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{stage.count}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-center leading-tight">{stage.label}</span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="hidden lg:flex w-full items-center justify-end pr-1 -mt-1 pointer-events-none absolute" />
                  )}
                </div>
              ))}
            </div>

            {/* Pipeline bar */}
            <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden flex">
              <div className="bg-gray-300 transition-all"        style={{ width: `${(3/22)*100}%` }} />
              <div className="bg-blue-300 transition-all"        style={{ width: `${(2/22)*100}%` }} />
              <div className="bg-amber-300 transition-all"       style={{ width: `${(1/22)*100}%` }} />
              <div className="bg-[#6CC3DA] transition-all"       style={{ width: `${(4/22)*100}%` }} />
              <div className="bg-green-400 transition-all"       style={{ width: `${(12/22)*100}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-1.5">22 total deals tracked</p>
          </div>

          {/* Budget — takes 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-md shadow-black/[0.04] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Monthly Budget</h3>
                <p className="text-xs text-gray-400 font-medium">March 2026</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#6CC3DA]" />
              </div>
            </div>

            {/* Donut-style stat */}
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-4xl font-black text-[#0F172A] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  ${BUDGET.spent.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 font-medium mt-1">of ${BUDGET.total.toLocaleString()} budget used</p>
              </div>
              <p className="text-2xl font-black text-[#6CC3DA]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{budgetPct}%</p>
            </div>

            {/* Progress bar */}
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6CC3DA] to-[#4ab0cc] transition-all duration-700"
                style={{ width: `${budgetPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-[#6CC3DA]" /> Spent
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-200" /> Remaining: ${(BUDGET.total - BUDGET.spent).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Recommended Athletes ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-5 bg-white px-7 py-5 rounded-2xl shadow-lg shadow-black/[0.04] border border-gray-100">
            <div className="flex items-center gap-5">
              <div className="w-1 h-10 rounded-full bg-gradient-to-b from-[#6CC3DA] to-[#6CC3DA]/20" />
              <div>
                <div className="flex items-center gap-3 mb-0.5">
                  <h2 className="text-3xl font-black text-[#0F172A] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    Recommended for Your Brand
                  </h2>
                  <span className="hidden md:inline-flex items-center gap-1.5 bg-[#6CC3DA]/10 border border-[#6CC3DA]/25 text-[#3aa8c5] text-[11px] font-bold tracking-widest uppercase rounded-full px-3 py-1">
                    <Target className="w-3 h-3" />
                    93% avg match
                  </span>
                </div>
                <p className="text-gray-400 text-sm font-medium">Athletes with high compatibility based on your industry and goals.</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/search')}
              className="text-[#0F172A] font-bold uppercase tracking-widest text-xs hover:text-[#6CC3DA] transition-colors flex items-center gap-1.5 shrink-0"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedAthletes.map((athlete) => (
              <div
                key={athlete.id}
                onClick={() => router.push('/dashboard/search')}
                className="bg-white rounded-2xl shadow-md shadow-black/[0.06] border border-gray-100 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col"
              >
                <div className="h-60 relative overflow-hidden bg-gray-100">
                  <ImageWithFallback
                    src={athlete.profileImage}
                    alt={athlete.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-300" />

                  <div className="absolute top-4 right-4 bg-[#6CC3DA] px-3 py-1 rounded-full text-[11px] font-black text-[#0F172A] uppercase tracking-wider shadow-md flex items-center gap-1.5">
                    <Target className="w-3 h-3" />
                    {athlete.compatibilityScore}% Match
                  </div>

                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl font-black text-white leading-tight uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        {athlete.name}
                      </h3>
                      {athlete.verified && <VerifiedBadge className="w-4 h-4 text-[#6CC3DA] drop-shadow shrink-0" />}
                    </div>
                    <p className="text-[#6CC3DA] text-xs font-bold tracking-wide">
                      {athlete.sport}
                      <span className="text-gray-500 mx-1.5">·</span>
                      <span className="text-gray-300 font-medium">{athlete.school}</span>
                    </p>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col bg-white">
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100 group-hover:border-[#6CC3DA]/20 transition-colors">
                      <p className="text-[10px] text-gray-400 font-black mb-1 uppercase tracking-widest">Followers</p>
                      <p className="text-lg font-black text-[#0F172A] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#6CC3DA]" />
                        {(athlete.followers / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <div className="bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100 group-hover:border-[#6CC3DA]/20 transition-colors">
                      <p className="text-[10px] text-gray-400 font-black mb-1 uppercase tracking-widest">Engagement</p>
                      <p className="text-lg font-black text-[#0F172A] flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#6CC3DA]" />
                        {athlete.engagementRate}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Price Range</p>
                      <p className="text-sm font-bold text-[#0F172A]">{athlete.priceRange}</p>
                    </div>
                    <button className="w-9 h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center group-hover:bg-[#6CC3DA] group-hover:text-[#0F172A] transition-colors shadow-md">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">

          {/* Active Campaigns */}
          <div
            onClick={() => router.push('/dashboard/campaigns')}
            className="bg-[#0F172A] rounded-2xl shadow-xl overflow-hidden group cursor-pointer relative"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#6CC3DA]/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-125 transition-all duration-700 pointer-events-none" />
            <div className="relative z-10 p-7">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#6CC3DA]/10 border border-[#6CC3DA]/20 rounded-xl flex items-center justify-center group-hover:bg-[#6CC3DA]/20 transition-all duration-300">
                    <Activity className="w-5 h-5 text-[#6CC3DA]" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Active Campaigns</h4>
                    <p className="text-xs text-gray-500 font-medium">Real-time performance</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all mt-0.5" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[['3','Running'],['1','Pending'],['87%','Avg Reach']].map(([val, lbl]) => (
                  <div key={lbl} className="bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 group-hover:border-white/[0.14] transition-colors">
                    <p className="text-3xl font-black text-white leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{val}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{lbl}</p>
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
            <div className="relative z-10 p-7">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center group-hover:bg-[#6CC3DA]/10 group-hover:border-[#6CC3DA]/25 transition-all duration-300">
                    <Bookmark className="w-5 h-5 text-[#0F172A] group-hover:text-[#3aa8c5] transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-[#0F172A] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Saved Athletes</h4>
                    <p className="text-xs text-gray-400 font-medium">Shortlisted for future deals</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#0F172A] group-hover:translate-x-1 transition-all mt-0.5" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[['12','Total'],['4','Basketball'],['5','Football']].map(([val, lbl]) => (
                  <div key={lbl} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 group-hover:border-[#6CC3DA]/20 transition-colors">
                    <p className="text-3xl font-black text-[#0F172A] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{val}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{lbl}</p>
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
