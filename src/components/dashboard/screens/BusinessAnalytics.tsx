'use client';

import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function BusinessAnalytics() {
  const [dateRange, setDateRange] = useState('last30');

  const engagementData = [
    { month: 'Jan', engagement: 8.5, reach: 180000 },
    { month: 'Feb', engagement: 9.2, reach: 210000 },
    { month: 'Mar', engagement: 8.8, reach: 195000 },
    { month: 'Apr', engagement: 9.5, reach: 225000 },
    { month: 'May', engagement: 10.2, reach: 250000 },
    { month: 'Jun', engagement: 9.8, reach: 235000 },
  ];

  const campaignPerformance = [
    { name: 'Spring Training', reach: 185000, engagement: 9.2, roi: 3.5 },
    { name: 'Basketball Season', reach: 210000, engagement: 8.8, roi: 4.2 },
    { name: 'Track & Field', reach: 165000, engagement: 10.1, roi: 3.8 },
    { name: 'Summer Wellness', reach: 145000, engagement: 7.5, roi: 2.9 },
  ];

  const sportDistribution = [
    { sport: 'Basketball', athletes: 8 },
    { sport: 'Football', athletes: 6 },
    { sport: 'Soccer', athletes: 5 },
    { sport: 'Track & Field', athletes: 12 },
    { sport: 'Volleyball', athletes: 4 },
    { sport: 'Other', athletes: 3 },
  ];

  const budgetAllocation = [
    { category: 'Content Creation', amount: 45000 },
    { category: 'Athlete Payments', amount: 85000 },
    { category: 'Platform Fees', amount: 12000 },
    { category: 'Marketing', amount: 18000 },
    { category: 'Production', amount: 25000 },
  ];

  const audienceDemographics = {
    ageGroups: [
      { age: '18-24', percentage: 45 },
      { age: '25-34', percentage: 30 },
      { age: '35-44', percentage: 15 },
      { age: '45+', percentage: 10 },
    ],
    gender: [
      { name: 'Male', value: 58 },
      { name: 'Female', value: 40 },
      { name: 'Other', value: 2 },
    ],
  };

  const COLORS = ['#6CC3DA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#EC4899'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>OVERALL ANALYTICS</h1>
          <p className="text-gray-600 mb-6">Comprehensive insights across all campaigns and partnerships</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2 font-bold">Date Range</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] text-gray-900">
                <option value="last7">Last 7 Days</option><option value="last30">Last 30 Days</option><option value="last90">Last 90 Days</option><option value="last6months">Last 6 Months</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
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

          {/* Charts Row 1 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-4 tracking-tight text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>ENGAGEMENT TRENDS</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="engagement" stroke="#6CC3DA" strokeWidth={3} name="Engagement Rate %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-4 tracking-tight text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>REACH OVER TIME</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="reach" stroke="#34D399" strokeWidth={3} name="Total Reach" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Campaign Performance */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-2xl mb-4 tracking-tight text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>CAMPAIGN PERFORMANCE COMPARISON</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis yAxisId="left" stroke="#6B7280" />
                <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="reach" fill="#6CC3DA" name="Reach" />
                <Bar yAxisId="left" dataKey="engagement" fill="#34D399" name="Engagement %" />
                <Bar yAxisId="right" dataKey="roi" fill="#FBBF24" name="ROI" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sport Distribution & Budget */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-4 tracking-tight text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>ATHLETES BY SPORT</h3>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie data={sportDistribution} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="athletes">
                      {sportDistribution.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {sportDistribution.map((item, index) => (
                    <div key={item.sport} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-sm text-black">{item.sport}</span>
                      </div>
                      <span className="text-sm font-bold text-black">{item.athletes}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-2xl mb-4 tracking-tight text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>BUDGET ALLOCATION</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={budgetAllocation} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" />
                  <YAxis dataKey="category" type="category" stroke="#6B7280" width={120} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '8px' }} formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#6CC3DA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-2xl mb-6 tracking-tight text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>AUDIENCE DEMOGRAPHICS</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-bold text-black mb-4">Age Distribution</h4>
                <div className="space-y-3">
                  {audienceDemographics.ageGroups.map(group => (
                    <div key={group.age}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-black">{group.age}</span>
                        <span className="text-sm font-bold text-black">{group.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${group.percentage}%`, backgroundColor: '#6CC3DA' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-black mb-4">Gender Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={audienceDemographics.gender} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {audienceDemographics.gender.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Athletes Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-2xl mb-4 tracking-tight text-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>TOP PERFORMING ATHLETES</h3>
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
