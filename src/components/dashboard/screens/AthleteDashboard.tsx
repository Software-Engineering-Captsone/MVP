'use client';

import { CheckCircle2, Calendar } from 'lucide-react';

export function AthleteDashboard() {
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

  const opportunities = [
    {
      id: 1,
      company: 'FitLife Nutrition',
      type: 'Product Review',
      compensation: '$800 - $1,200',
      posted: '2 days ago',
    },
    {
      id: 2,
      company: 'Local Auto Dealership',
      type: 'Commercial Shoot',
      compensation: '$2,000 - $3,500',
      posted: '5 days ago',
    },
    {
      id: 3,
      company: 'Study App Co',
      type: 'Brand Ambassador',
      compensation: '$1,500/month',
      posted: '1 week ago',
    },
  ];

  return (
    <div className="p-10 bg-[#FAFAFA] min-h-full font-sans">
      {/* Header */}
      <div className="mb-12 relative">
        <div className="absolute top-0 left-0 w-24 h-1 bg-[#6CC3DA] mb-6 rounded-r-full"></div>
        <h1
          className="text-7xl mt-6 mb-1 tracking-normal leading-none text-[#0F172A]"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          DASHBOARD<span className="text-[#6CC3DA]">.</span>
        </h1>
        <p className="text-gray-500 font-medium tracking-widest text-sm uppercase">Welcome back, Marcus. Here is your NIL activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-16">
        <div className="bg-[#0F172A] rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#6CC3DA]/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
          <h3 className="text-5xl font-black mb-2 text-white tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            $7,500
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Earnings</p>
        </div>

        <div className="bg-white border hover:border-[#6CC3DA]/50 transition-all rounded-2xl p-8 shadow-sm group">
          <h3 className="text-5xl font-black mb-2 text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            3
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-[#6CC3DA] transition-colors">Active Deals</p>
        </div>

        <div className="bg-white border hover:border-[#6CC3DA]/50 transition-all rounded-2xl p-8 shadow-sm group">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-5xl font-black text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              5
            </h3>
            <span className="w-3 h-3 rounded-full bg-[#6CC3DA] animate-pulse"></span>
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-[#6CC3DA] transition-colors">Unread Messages</p>
        </div>

        <div className="bg-white border hover:border-[#6CC3DA]/50 transition-all rounded-2xl p-8 shadow-sm group flex flex-col justify-between">
          <div>
            <h3 className="text-5xl font-black mb-2 text-gray-900 tracking-normal leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              85%
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest group-hover:text-[#6CC3DA] transition-colors">Profile Complete</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
             <div className="bg-[#6CC3DA] h-1.5 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12">
        {/* Active Deals */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <h2
              className="text-3xl tracking-wide leading-tight text-[#0F172A]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              ACTIVE DEALS
            </h2>
            <span className="text-sm font-bold text-[#6CC3DA] hover:text-[#0F172A] cursor-pointer transition-colors">VIEW ALL</span>
          </div>
          <div className="flex flex-col">
            {activeDeals.map((deal, i) => (
              <div
                key={deal.id}
                className={`py-5 flex items-center justify-between group cursor-pointer ${i !== activeDeals.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#6CC3DA] transition-colors">{deal.brand}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500 font-medium">{deal.type}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{deal.deadline}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-[#0F172A]">
                    {deal.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Opportunities */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <h2
              className="text-3xl tracking-wide text-[#0F172A]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              OPPORTUNITIES
            </h2>
             <span className="text-sm font-bold text-[#6CC3DA] hover:text-[#0F172A] cursor-pointer transition-colors">EXPLORE</span>
          </div>
          <div className="flex flex-col">
            {opportunities.map((opp, i) => (
              <div
                key={opp.id}
                className={`py-5 flex items-center justify-between group ${i !== opportunities.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex-1 pr-6">
                  <h3 className="font-bold text-lg text-gray-900">{opp.company}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500 font-medium">{opp.type}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{opp.posted}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <span className="text-sm font-bold text-[#6CC3DA] bg-[#EBF7FB] px-3 py-1 rounded-full">
                    {opp.compensation}
                  </span>
                  <button className="text-xs font-bold text-gray-400 hover:text-[#0F172A] uppercase tracking-widest transition-colors">
                    Apply Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Completion */}
      <div className="mt-16 bg-[#0F172A] rounded-2xl p-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#6CC3DA]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
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
            
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#6CC3DA]/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#6CC3DA]" />
                </div>
                <span className="text-white font-semibold text-sm">Basic Info</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#6CC3DA]/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#6CC3DA]" />
                </div>
                <span className="text-white font-semibold text-sm">Socials</span>
              </div>
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                </div>
                <span className="text-white font-semibold text-sm">Achievements</span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <button className="px-8 py-4 bg-white text-[#0F172A] font-black uppercase tracking-widest text-sm hover:bg-[#6CC3DA] hover:text-white transition-all rounded-xl shadow-xl">
              Finish Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
