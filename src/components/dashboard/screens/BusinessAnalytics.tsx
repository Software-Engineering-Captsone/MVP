'use client';

import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDashboard } from '@/components/dashboard/DashboardShell';

export function BusinessAnalytics() {
  const { accountType } = useDashboard();

  const sportDistribution = [
    { sport: 'Basketball', athletes: 8 },
    { sport: 'Football', athletes: 6 },
    { sport: 'Soccer', athletes: 5 },
    { sport: 'Track & Field', athletes: 12 },
    { sport: 'Volleyball', athletes: 4 },
    { sport: 'Other', athletes: 3 },
  ];

  /** Share of partnership offers by platform (mock — wire to deals/outreach when available). */
  const channelMix = [
    { channel: 'Instagram', offers: 18 },
    { channel: 'TikTok', offers: 24 },
  ];

  const audienceDemographics = {
    ageGroups: [
      { age: '18-24', percentage: 45 },
      { age: '25-34', percentage: 30 },
      { age: '35-44', percentage: 15 },
      { age: '45+', percentage: 10 },
    ],
    gender: [
      { gender: 'Male', percentage: 58 },
      { gender: 'Female', percentage: 40 },
      { gender: 'Other', percentage: 2 },
    ],
  };

  const sportTotal = sportDistribution.reduce((sum, s) => sum + s.athletes, 0);
  const channelTotal = channelMix.reduce((sum, c) => sum + c.offers, 0);

  const sectionDescriptionClass = 'text-sm text-gray-600 mb-4 max-w-prose leading-snug';

  return (
    <div className="min-h-screen bg-nilink-page">
      <div className="border-b border-gray-100 bg-white py-8 dash-main-gutter-x">
        <div>
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
      </div>

      <div className="py-8 pb-12 dash-main-gutter-x">
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Total Reach', value: '1.21M', change: '+12.5%' },
              { label: 'Avg. Engagement', value: '9.2%', change: '+8.3%' },
              { label: 'Total ROI', value: '3.6x', change: '+15.7%' },
              { label: 'Active Athletes', value: '38', change: '+5' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">{stat.label}</p>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-black">{stat.value}</p>
                  <div className="px-3 py-2 rounded-lg bg-green-100">
                    <span className="text-base font-bold text-green-600">{stat.change}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sport distribution & channel mix */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-2 tracking-wide text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>ATHLETES BY SPORT</h3>
              <p className={sectionDescriptionClass}>
                Shows how many athletes you partner with in each sport so you can see where your roster is concentrated.
              </p>
              <div className="space-y-3">
                {sportDistribution.map((item) => (
                  <div key={item.sport}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-black">{item.sport}</span>
                      <span className="text-sm font-bold text-black">{item.athletes}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-nilink-accent"
                        style={{ width: `${sportTotal > 0 ? (item.athletes / sportTotal) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-2 tracking-wide text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>CHANNEL MIX</h3>
              <p className={sectionDescriptionClass}>
                Shows which social platforms your collaboration offers emphasize most relative to the rest.
              </p>
              <div className="space-y-3">
                {channelMix.map((item) => (
                  <div key={item.channel}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-black">{item.channel}</span>
                      <span className="text-sm font-bold text-black">{item.offers}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-nilink-accent"
                        style={{ width: `${channelTotal > 0 ? (item.offers / channelTotal) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-2 tracking-wide text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>AGE DISTRIBUTION</h3>
              <p className={sectionDescriptionClass}>
                Breaks down the age bands of the audience your campaigns reach so you can see who you are hitting.
              </p>
              <div className="space-y-3">
                {audienceDemographics.ageGroups.map(group => (
                  <div key={group.age}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-black">{group.age}</span>
                      <span className="text-sm font-bold text-black">{group.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-nilink-accent" style={{ width: `${group.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-2 tracking-wide text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>GENDER DISTRIBUTION</h3>
              <p className={sectionDescriptionClass}>
                Summarizes how your reached audience splits across gender so you can spot skew at a glance.
              </p>
              <div className="space-y-3">
                {audienceDemographics.gender.map((group) => (
                  <div key={group.gender}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-black">{group.gender}</span>
                      <span className="text-sm font-bold text-black">{group.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-nilink-accent" style={{ width: `${group.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Athletes Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-2xl mb-2 tracking-wide text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>TOP PERFORMING ATHLETES</h3>
            <p className={sectionDescriptionClass}>
              Surfaces the athletes driving the strongest reach, engagement, and ROI so you can compare leaders quickly.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-bold text-black">Athlete</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-black">Sport</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-black">Reach</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-black">Engagement</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-black">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Marcus Johnson', sport: 'Basketball', reach: '37.9K', engagement: '8.5%', roi: '4.2x' },
                    { name: 'Sarah Chen', sport: 'Soccer', reach: '28.5K', engagement: '9.2%', roi: '3.8x' },
                    { name: 'Aisha Patel', sport: 'Tennis', reach: '32.1K', engagement: '8.8%', roi: '3.5x' },
                    { name: 'Tyler Washington', sport: 'Football', reach: '45.2K', engagement: '7.8%', roi: '3.2x' },
                  ].map((athlete, i) => (
                    <tr key={athlete.name} className={`${i < 3 ? 'border-b border-gray-100' : ''} hover:bg-gray-50`}>
                      <td className="py-3 px-4 font-medium text-black">{athlete.name}</td>
                      <td className="py-3 px-4 text-black">{athlete.sport}</td>
                      <td className="py-3 px-4 text-right font-bold text-black">{athlete.reach}</td>
                      <td className="py-3 px-4 text-right font-bold text-black">{athlete.engagement}</td>
                      <td className="py-3 px-4 text-right font-bold text-black">{athlete.roi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
