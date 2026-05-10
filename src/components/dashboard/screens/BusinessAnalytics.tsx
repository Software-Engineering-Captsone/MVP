'use client';

import { useEffect, useState } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { AnalyticsSkeleton } from '@/components/dashboard/skeletons/AnalyticsSkeleton';

type AnalyticsData = {
  totals: {
    campaigns: number;
    applications: number;
    offers: number;
    deals: number;
    athletes: number;
    pipelineValueCents: number;
    currency: string;
  };
  sportDistribution: Record<string, number>;
  channelMix: Record<string, number>;
};

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function conversionRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (items.length === 0 || total === 0) {
    return <p className="text-sm text-gray-400">No data yet.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-black">{item.label}</span>
            <span className="text-sm font-bold text-black">{item.value}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-nilink-accent"
              style={{ width: `${(item.value / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BusinessAnalytics() {
  const { accountType } = useDashboard();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/brand')
      .then((r) => r.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AnalyticsSkeleton />;

  const totals = data?.totals ?? {
    campaigns: 0,
    applications: 0,
    offers: 0,
    deals: 0,
    athletes: 0,
    pipelineValueCents: 0,
    currency: 'USD',
  };
  const isEmpty = totals.campaigns === 0;

  const sportItems = Object.entries(data?.sportDistribution ?? {}).map(([label, value]) => ({ label, value }));
  const channelItems = Object.entries(data?.channelMix ?? {}).map(([label, value]) => ({ label, value }));

  const sectionDescriptionClass = 'text-sm text-gray-600 mb-4 max-w-prose leading-snug';
  const cardHeadingStyle = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 };

  return (
    <div className="min-h-screen bg-nilink-page">
      <div className="border-b border-gray-100 bg-white py-8 dash-main-gutter-x">
        <DashboardPageHeader
          title="Analytics"
          subtitle={
            accountType === 'business'
              ? 'Campaign and partnership performance'
              : 'Growth and performance across your channels'
          }
          className="mb-6"
        />
      </div>

      <div className="py-8 pb-12 dash-main-gutter-x">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-semibold text-gray-700 mb-2">No campaign data yet</p>
            <p className="text-sm text-gray-500">
              Publish your first campaign to see analytics here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {[
                { label: 'Campaigns', value: String(totals.campaigns) },
                { label: 'Applications', value: String(totals.applications) },
                { label: 'Athletes Engaged', value: String(totals.athletes) },
                { label: 'Pipeline Value', value: formatCurrency(totals.pipelineValueCents) },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <p className="text-sm text-gray-600 mb-2 font-bold">{stat.label}</p>
                  <p className="text-3xl font-bold text-black">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Sport Mix + Channel Mix */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-2xl mb-2 tracking-wide text-black" style={cardHeadingStyle}>
                  SPORT MIX
                </h3>
                <p className={sectionDescriptionClass}>
                  Shows how your campaigns are distributed across sports so you can see where your targeting is concentrated.
                </p>
                <BarList items={sportItems} />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-2xl mb-2 tracking-wide text-black" style={cardHeadingStyle}>
                  CHANNEL MIX
                </h3>
                <p className={sectionDescriptionClass}>
                  Shows which social platforms your campaigns target most relative to the rest.
                </p>
                <BarList items={channelItems} />
              </div>
            </div>

            {/* Pipeline Funnel */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-2 tracking-wide text-black" style={cardHeadingStyle}>
                PIPELINE FUNNEL
              </h3>
              <p className={sectionDescriptionClass}>
                Tracks how many athletes move through each stage from application to a completed deal.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {[
                  { stage: 'Applications', count: totals.applications, sub: null },
                  {
                    stage: 'Offers',
                    count: totals.offers,
                    sub: `${conversionRate(totals.offers, totals.applications)} of applications`,
                  },
                  {
                    stage: 'Deals',
                    count: totals.deals,
                    sub: `${conversionRate(totals.deals, totals.offers)} of offers`,
                  },
                ].map(({ stage, count, sub }) => (
                  <div
                    key={stage}
                    className="rounded-lg bg-gray-50 border border-gray-200 p-5 text-center"
                  >
                    <p className="text-sm text-gray-500 mb-1">{stage}</p>
                    <p className="text-4xl font-bold text-black">{count}</p>
                    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
