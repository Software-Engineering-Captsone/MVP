'use client';

import { CheckCircle2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { getBrandImageByName } from '@/lib/mockData';
import { staggerContainer, staggerItem } from '@/components/dashboard/dashboardMotion';

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
    <div className="p-8 md:p-10 bg-nilink-page min-h-full font-sans text-nilink-ink">
      {/* Header */}
      <motion.div
        className="mb-12 relative"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="absolute top-0 left-0 w-24 h-1 bg-nilink-accent-bright mb-6 rounded-r-full" />
        <h1
          className="text-5xl sm:text-6xl md:text-7xl mt-6 mb-1 tracking-normal leading-none text-nilink-ink"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          DASHBOARD<span className="text-nilink-accent">.</span>
        </h1>
        <p className="text-gray-500 font-medium tracking-widest text-sm uppercase">
          Welcome back, Marcus. Here is your NIL activity.
        </p>
      </motion.div>

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
            <span className="text-sm font-bold text-nilink-accent hover:text-nilink-ink cursor-pointer transition-colors">
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
                className={`py-5 flex items-center justify-between group cursor-pointer ${i !== activeDeals.length - 1 ? 'border-b border-gray-100' : ''}`}
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

        {/* New Opportunities */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <h2
              className="text-3xl tracking-wide text-nilink-ink"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              OPPORTUNITIES
            </h2>
            <span className="text-sm font-bold text-nilink-accent hover:text-nilink-ink cursor-pointer transition-colors">
              EXPLORE
            </span>
          </div>
          <div className="flex flex-col">
            {opportunities.map((opp, i) => (
              <motion.div
                key={opp.id}
                layout
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                className={`py-5 flex items-center justify-between group ${i !== opportunities.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex-1 pr-6 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-white border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden mt-0.5">
                    <img src={getBrandImageByName(opp.company)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{opp.company}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500 font-medium">{opp.type}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{opp.posted}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-bold text-nilink-accent bg-nilink-accent-soft px-3 py-1 rounded-full">
                    {opp.compensation}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-bold text-gray-400 hover:text-nilink-ink uppercase tracking-widest transition-colors"
                  >
                    Apply Now →
                  </button>
                </div>
              </motion.div>
            ))}
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
