'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, CheckCircle2, Clock, ChevronDown, FileText } from 'lucide-react';
import { getBrandImageByName } from '@/lib/mockData';

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white p-8 border-b border-nilink-accent-border">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl mb-2 tracking-wide leading-snug text-nilink-ink font-bebas">
            DEAL MANAGEMENT
          </h1>
          <p className="text-gray-600 mb-6">Track your sponsorship deals, deliverables, and payments</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-600 mb-2 font-bold">Total Earnings</p>
              <p className="text-3xl font-bold text-black">${deals.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-600 mb-2 font-bold">Active Deals</p>
              <p className="text-3xl font-bold text-black">{tabCounts.active}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-600 mb-2 font-bold">Completed</p>
              <p className="text-3xl font-bold text-black">{tabCounts.completed}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            {(['active', 'pending', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-nilink-accent text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.toUpperCase()} ({tabCounts[tab]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deals List */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {filteredDeals.map((deal) => (
            <motion.div
              key={deal.id}
              layout
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedDeal(deal)}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
                    <img src={getBrandImageByName(deal.brand)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                  <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {deal.brand.toUpperCase()}
                  </h3>
                  <p className="text-gray-600">{deal.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-nilink-accent">
                    ${deal.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{deal.paymentSchedule}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-gray-500">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />{deal.startDate} - {deal.endDate}
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {deal.deliverables.filter(d => d.completed).length}/{deal.deliverables.length} deliverables
                  </span>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-nilink-accent-bright"
                    style={{
                      width: `${(deal.deliverables.filter(d => d.completed).length / deal.deliverables.length) * 100}%`,
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedDeal(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 p-6 flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
                <img src={getBrandImageByName(selectedDeal.brand)} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
              <h2 className="text-3xl font-bebas text-nilink-ink">
                {selectedDeal.brand.toUpperCase()}
              </h2>
              <p className="text-gray-600">{selectedDeal.type}</p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Deal Amount</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-600">${selectedDeal.amount.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-nilink-accent" />
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Duration</h3>
                  </div>
                  <p className="text-sm text-gray-700">{selectedDeal.startDate}<br />to {selectedDeal.endDate}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Payment Schedule</h3>
                <p className="text-gray-700">{selectedDeal.paymentSchedule}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-500 uppercase">Deliverables</h3>
                  <span className="text-sm font-bold text-nilink-accent">
                    {selectedDeal.deliverables.filter(d => d.completed).length}/{selectedDeal.deliverables.length} Completed
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedDeal.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${deliverable.completed ? 'bg-nilink-accent' : 'bg-gray-300'}`}>
                        {deliverable.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <span className={deliverable.completed ? 'text-gray-900' : 'text-gray-500'}>{deliverable.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" className="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-nilink-accent hover:bg-nilink-accent-hover transition-colors">
                  VIEW CONTRACT
                </button>
                <button type="button" className="flex-1 px-6 py-3 rounded-lg font-bold border-2 border-nilink-accent text-nilink-accent hover:bg-nilink-accent-soft transition-colors">
                  MESSAGE BRAND
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
