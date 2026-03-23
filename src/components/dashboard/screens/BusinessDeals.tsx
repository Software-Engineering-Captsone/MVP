'use client';

import { useState } from 'react';
import { Search, MoreHorizontal, FileText } from 'lucide-react';
import { mockAthletes } from '@/lib/mockData';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

// Reusing same icons from Discovery
const FootballIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="7" transform="rotate(-45 12 12)" />
    <path d="M8 8l8 8" />
    <path d="M11 9l2 2" />
    <path d="M9 11l2 2" />
    <path d="M13 11l2 2" />
  </svg>
);

const BaseballIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2A10 10 0 0 1 12 22" />
    <path d="M12 2A10 10 0 0 0 12 22" />
    <path d="M8 5a8 8 0 0 0 0 14" />
    <path d="M16 5a8 8 0 0 1 0 14" />
  </svg>
);

const sports = ['Football', 'Baseball', 'Softball', 'Cheerleading', 'Dance', 'Basketball', 'Beach Volleyball'];

interface Invoice {
  id: string;
  amount: number;
  number: string;
  status: 'Unpaid' | 'Past Due' | 'Paid' | 'Draft';
  athleteName: string;
  email: string;
  lastUpdated: string;
  created: string;
}

const mockInvoices: Invoice[] = [
  { id: '1', amount: 500, number: 'INV0938-09-001', status: 'Unpaid', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: 'Sep 2, 2026 02:29 AM', created: 'Sep 2, 2026 02:29 AM' },
  { id: '2', amount: 1500, number: 'INV0938-09-001', status: 'Past Due', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: '--', created: 'Sep 2, 2026 02:29 AM' },
  { id: '3', amount: 4500, number: 'INV0938-09-001', status: 'Paid', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: '--', created: 'Sep 2, 2026 02:29 AM' },
  { id: '4', amount: 2500, number: 'INV0938-09-001', status: 'Unpaid', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: '--', created: 'Sep 2, 2026 02:29 AM' },
  { id: '5', amount: 500, number: 'INV0938-09-001', status: 'Draft', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: 'Sep 2, 2026 02:29 AM', created: 'Sep 2, 2026 02:29 AM' },
  { id: '6', amount: 500, number: 'INV0938-09-001', status: 'Unpaid', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: 'Sep 2, 2026 02:29 AM', created: 'Sep 2, 2026 02:29 AM' },
  { id: '7', amount: 500, number: 'INV0938-09-001', status: 'Paid', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: 'Sep 2, 2026 02:29 AM', created: 'Sep 2, 2026 02:29 AM' },
  { id: '8', amount: 4500, number: 'INV0938-09-001', status: 'Paid', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: '--', created: 'Sep 2, 2026 02:29 AM' },
  { id: '9', amount: 1500, number: 'INV0938-09-001', status: 'Past Due', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: '--', created: 'Sep 2, 2026 02:29 AM' },
  { id: '10', amount: 4500, number: 'INV0938-09-001', status: 'Paid', athleteName: 'Emalee Frost', email: 'emailsample@gmail.com', lastUpdated: '--', created: 'Sep 2, 2026 02:29 AM' },
];

const StatusBadge = ({ status }: { status: Invoice['status'] }) => {
  const getStyles = () => {
    switch (status) {
      case 'Unpaid': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'Past Due': return 'bg-red-50 text-red-500 border-red-200';
      case 'Paid': return 'bg-green-50 text-green-600 border-green-200';
      case 'Draft': return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getStyles()} ml-3`}>
      {status}
    </span>
  );
};

export function BusinessDeals() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredInvoices = mockInvoices.filter(i => {
    if (statusFilter !== 'All' && i.status !== statusFilter) return false;
    if (searchQuery && !i.athleteName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-nilink-surface overflow-hidden text-nilink-ink">
      {/* Top Filter Bar */}
      <div className="dash-main-gutter-x flex shrink-0 items-center gap-3 border-b border-gray-100 py-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Athletes...."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
        
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          All Filters
        </button>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 pb-1">
          {sports.map(sport => {
            const isActive = activeSport === sport;
            return (
              <button
                key={sport}
                onClick={() => setActiveSport(isActive ? null : sport)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive 
                    ? 'border-nilink-sidebar bg-nilink-sidebar text-white' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {sport === 'Football' && <FootballIcon className="w-4 h-4" />}
                {(sport === 'Baseball' || sport === 'Softball') && <BaseballIcon className="w-4 h-4" />}
                {sport !== 'Football' && sport !== 'Baseball' && sport !== 'Softball' && (
                  <div className="w-4 h-4 rounded-full border border-current opacity-50 flex items-center justify-center text-[8px]">✦</div>
                )}
                {sport}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-3 pt-5">
          <DashboardPageHeader title="Deals" subtitle="Invoices, quotes, and athlete payments" />
        </div>

        {/* Actions Bar */}
        <div className="dash-main-gutter-x flex shrink-0 flex-wrap items-center gap-4 py-5">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            Last 7 days <span className="ml-1 text-[10px]">▼</span>
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            Mar 15 - Mar 22 <span className="ml-1 text-[10px]">▼</span>
          </button>

          <div className="ml-2 flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {['All', 'Draft', 'Unpaid', 'Paid'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  statusFilter === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status} <span className="ml-1 font-normal text-gray-400">125</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-auto pb-6 dash-main-gutter-x">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] font-bold text-gray-500 uppercase bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 rounded-l-xl">AMOUNT</th>
                <th className="px-5 py-3">INVOICE NUMBER</th>
                <th className="px-5 py-3">ATHLETE NAME</th>
                <th className="px-5 py-3">EMAIL</th>
                <th className="px-5 py-3">LAST UPDATED</th>
                <th className="px-5 py-3">CREATED</th>
                <th className="px-5 py-3 rounded-r-xl w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, idx) => (
                <tr key={`${invoice.id}-${idx}`} className="group hover:bg-gray-50 border-b border-gray-50 last:border-0">
                  <td className="px-5 py-4 font-bold text-gray-900">${invoice.amount}</td>
                  <td className="px-5 py-4 font-medium text-gray-700">
                    {invoice.number}
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">{invoice.athleteName}</td>
                  <td className="px-5 py-4 text-gray-500">{invoice.email}</td>
                  <td className="px-5 py-4 text-gray-500">{invoice.lastUpdated}</td>
                  <td className="px-5 py-4 text-gray-500">{invoice.created}</td>
                  <td className="px-5 py-4 text-gray-400">
                    <button className="p-1 rounded hover:bg-gray-200 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-8 text-center pb-8">
            <button type="button" className="text-sm font-bold text-nilink-accent hover:text-nilink-accent-hover transition-colors">
              Load More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
