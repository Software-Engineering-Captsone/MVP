'use client';

import { useRouter } from 'next/navigation';
import {
  TrendingUp, Target, Users, ArrowRight,
  Activity, Bookmark, ChevronRight,
  DollarSign, BarChart3, ArrowUpRight, Instagram, Facebook
} from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { mockAthletes } from '@/lib/mockData';

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

const PIPELINE = [
  { label: 'Outreach',    count: 3,  color: 'bg-gray-50'       },
  { label: 'In Review',   count: 2,  color: 'bg-blue-50'       },
  { label: 'Negotiating', count: 1,  color: 'bg-amber-50'     },
  { label: 'Active',      count: 4,  color: 'bg-purple-50' },
  { label: 'Completed',   count: 12, color: 'bg-emerald-50'     },
];

export function BusinessOverview() {
  const router = useRouter();

  return (
    <div className="h-full flex flex-col bg-white overflow-auto text-[#1C1C1E]">
      {/* ── Title Area ── */}
      <div className="px-6 py-6 shrink-0 border-b border-gray-100 mb-6">
        <h1
          className="text-4xl font-black tracking-wide uppercase"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          Dashboard
        </h1>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 pb-8 relative z-20 space-y-8">

        {/* ── KPI Strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_STATS.map(({ label, value, sub, icon: Icon, accent }) => (
            <div
              key={label}
              className="bg-gray-50 rounded-xl p-5 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <p
                className="text-4xl font-black leading-none text-[#1C1C1E] mb-2"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {value}
              </p>
              <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" />
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Deal Pipeline ────────────────────────────────────── */}
        <div>
          <div
            className="w-full bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:border-gray-300 transition-all duration-200 group"
            onClick={() => router.push('/dashboard/deals')}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="text-2xl font-black text-[#1C1C1E] leading-none mb-1"
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
                      className="text-3xl font-black leading-none text-[#1C1C1E]"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {count}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center leading-tight text-gray-500">
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
              <div className="bg-purple-300" style={{ width: `${(4/22)*100}%` }} />
              <div className="bg-emerald-400" style={{ width: `${(12/22)*100}%` }} />
            </div>
            <p className="text-[10px] text-gray-500 font-medium mt-2">22 total deals tracked</p>
          </div>
        </div>

        {/* ── Recommended Athletes ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recommended for Your Brand</h2>
            <button 
              onClick={() => router.push('/dashboard/search')}
              className="px-4 py-1.5 bg-[#1C1C1E] text-white text-sm font-medium rounded-lg hover:bg-[#2D2D2F]"
            >
              See All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {mockAthletes.slice(0, 4).map((athlete) => (
              <div
                key={athlete.id}
                onClick={() => router.push('/dashboard/search')}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                  <ImageWithFallback
                    src={athlete.image}
                    alt={athlete.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-[#6CC3DA] px-2.5 py-1 rounded-full text-[10px] font-black text-[#0F172A] uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Target className="w-2.5 h-2.5" />
                    {98 - parseInt(athlete.id)}% Match
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{athlete.name}</span>
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
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
