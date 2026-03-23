'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, CheckCircle2 } from 'lucide-react';
import { getBrandImageByName } from '@/lib/mockData';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

interface Deal {
  id: number;
  brand: string;
  type: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'pending' | 'completed';
  deliverables: { name: string; completed: boolean }[];
  paymentSchedule: string;
}

export function DealManagement() {
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'completed'>('active');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const deals: Deal[] = [
    {
      id: 1, brand: 'PowerFuel Energy', type: 'Social Media Campaign', amount: 2500,
      startDate: 'Mar 1, 2026', endDate: 'Apr 30, 2026', status: 'active',
      deliverables: [
        { name: '3 Instagram Posts', completed: true },
        { name: '2 TikTok Videos', completed: true },
        { name: '1 Product Review', completed: false },
      ],
      paymentSchedule: '50% upfront, 50% upon completion',
    },
    {
      id: 2, brand: 'Campus Threads', type: 'Product Endorsement', amount: 1800,
      startDate: 'Feb 15, 2026', endDate: 'May 15, 2026', status: 'active',
      deliverables: [
        { name: '4 Instagram Posts', completed: true },
        { name: '3 Stories per week', completed: true },
        { name: '1 Live Session', completed: true },
        { name: 'Merchandise Photoshoot', completed: false },
      ],
      paymentSchedule: 'Monthly installments',
    },
    {
      id: 3, brand: 'TechGear Pro', type: 'Event Appearance', amount: 3200,
      startDate: 'Apr 1, 2026', endDate: 'May 31, 2026', status: 'pending',
      deliverables: [
        { name: 'Product Launch Event', completed: false },
        { name: '2 Social Media Posts', completed: false },
      ],
      paymentSchedule: 'Lump sum payment',
    },
    {
      id: 4, brand: 'FitLife Nutrition', type: 'Ambassador Program', amount: 1500,
      startDate: 'Jan 1, 2026', endDate: 'Feb 28, 2026', status: 'completed',
      deliverables: [
        { name: '6 Instagram Posts', completed: true },
        { name: '4 TikTok Videos', completed: true },
        { name: '2 Stories per week', completed: true },
      ],
      paymentSchedule: 'Monthly installments',
    },
  ];

  const filteredDeals = deals.filter(d => d.status === activeTab);

  const tabCounts = {
    active: deals.filter(d => d.status === 'active').length,
    pending: deals.filter(d => d.status === 'pending').length,
    completed: deals.filter(d => d.status === 'completed').length,
  };

  const totalEarnings = deals.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="flex h-full min-h-full flex-col bg-nilink-page font-sans text-nilink-ink">
      {/* Header — aligned with athlete dashboard: ink typography, accent as a thin accent only */}
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white py-8">
        <div className="relative">
          <DashboardPageHeader
            title="Deals"
            subtitle="Track sponsorships, deliverables, and payments"
            className="mb-6"
          />

          {/* Stats — same language as athlete dashboard: dark hero tile + white metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl bg-nilink-sidebar p-6 shadow-xl">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-nilink-accent-bright/15 blur-2xl" />
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total earnings</p>
              <p
                className="mt-2 text-4xl font-black text-white"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                ${totalEarnings.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Active</p>
              <p
                className="mt-2 text-4xl font-black text-nilink-ink"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {tabCounts.active}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Completed</p>
              <p
                className="mt-2 text-4xl font-black text-nilink-ink"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {tabCounts.completed}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deals List — status chips sit with the list (same pattern as profile content filters) */}
      <div className="flex-1 overflow-auto pb-8 pt-5 dash-main-gutter-x">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-gray-700">
              Your deals{' '}
              <span className="font-normal text-gray-400">
                ({filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'})
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by deal status">
              {(['active', 'pending', 'completed'] as const).map((tab) => {
                const selected = activeTab === tab;
                const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition sm:text-[13px] ${
                      selected
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}{' '}
                    <span className={selected ? 'text-white/80' : 'text-gray-400'}>({tabCounts[tab]})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
          {filteredDeals.map((deal) => (
            <motion.div
              key={deal.id}
              layout
              className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
              onClick={() => setSelectedDeal(deal)}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white">
                    <img src={getBrandImageByName(deal.brand)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h3
                      className="text-2xl font-bold text-nilink-ink"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {deal.brand.toUpperCase()}
                    </h3>
                    <p className="text-gray-600">{deal.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-2xl font-black text-nilink-ink"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    ${deal.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{deal.paymentSchedule}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-wrap items-center gap-4 text-gray-500">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {deal.startDate} - {deal.endDate}
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    {deal.deliverables.filter((d) => d.completed).length}/{deal.deliverables.length} deliverables
                  </span>
                </div>
                <div className="h-2 w-32 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-nilink-ink/80"
                    style={{
                      width: `${(deal.deliverables.filter((d) => d.completed).length / deal.deliverables.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
          </div>
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-8"
          onClick={() => setSelectedDeal(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl cursor-auto overflow-auto rounded-2xl border border-gray-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 border-b border-gray-100 p-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                <img src={getBrandImageByName(selectedDeal.brand)} alt="" className="h-full w-full object-cover" />
              </div>
              <div>
                <h2 className="text-3xl text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {selectedDeal.brand.toUpperCase()}
                </h2>
                <p className="text-gray-600">{selectedDeal.type}</p>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-nilink-page p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Deal amount</h3>
                  </div>
                  <p className="text-3xl font-black text-nilink-ink" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    ${selectedDeal.amount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-nilink-page p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Duration</h3>
                  </div>
                  <p className="text-sm text-gray-700">
                    {selectedDeal.startDate}
                    <br />
                    to {selectedDeal.endDate}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Payment schedule</h3>
                <p className="text-gray-700">{selectedDeal.paymentSchedule}</p>
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Deliverables</h3>
                  <span className="text-sm font-bold text-nilink-ink">
                    {selectedDeal.deliverables.filter((d) => d.completed).length}/{selectedDeal.deliverables.length}{' '}
                    done
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedDeal.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded ${
                          deliverable.completed ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}
                      >
                        {deliverable.completed && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      <span className={deliverable.completed ? 'text-gray-900' : 'text-gray-500'}>{deliverable.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-nilink-ink px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gray-800"
                >
                  View contract
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-nilink-ink transition-colors hover:bg-gray-50"
                >
                  Message brand
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
