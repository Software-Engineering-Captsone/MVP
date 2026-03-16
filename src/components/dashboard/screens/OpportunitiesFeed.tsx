'use client';

import { useState } from 'react';
import { Search, Filter, DollarSign, Calendar, Building2, Bookmark, MapPin } from 'lucide-react';

interface Opportunity {
  id: number;
  company: string;
  title: string;
  type: string;
  compensation: string;
  location: string;
  deadline: string;
  posted: string;
  sport: string;
  description: string;
  saved: boolean;
}

export function OpportunitiesFeed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [opportunities, setOpportunities] = useState<Opportunity[]>([
    {
      id: 1, company: 'PowerFuel Energy', title: 'Spring Training Ambassador',
      type: 'Brand Ambassador', compensation: '$2,000 - $3,500', location: 'Remote',
      deadline: 'Mar 30, 2026', posted: '2 days ago', sport: 'All Sports',
      description: 'Looking for athletes to represent our spring training energy drink line. Includes social media posts, product reviews, and event appearances.',
      saved: false,
    },
    {
      id: 2, company: 'Campus Threads', title: 'Social Media Campaign',
      type: 'Social Media', compensation: '$800 - $1,200', location: 'Remote',
      deadline: 'Apr 15, 2026', posted: '5 days ago', sport: 'All Sports',
      description: 'Create engaging content featuring our new spring collection. 3 Instagram posts and 2 TikTok videos required.',
      saved: true,
    },
    {
      id: 3, company: 'TechGear Pro', title: 'Product Launch Event',
      type: 'Event Appearance', compensation: '$3,000 - $5,000', location: 'Austin, TX',
      deadline: 'Apr 1, 2026', posted: '1 week ago', sport: 'Basketball',
      description: 'Join us for the launch of our new basketball training gear. Includes a meet-and-greet and product demonstration.',
      saved: false,
    },
    {
      id: 4, company: 'FitLife Nutrition', title: 'Monthly Product Review',
      type: 'Product Review', compensation: '$500/month', location: 'Remote',
      deadline: 'Open', posted: '3 days ago', sport: 'All Sports',
      description: 'Monthly subscription box review featuring our latest health and nutrition products.',
      saved: false,
    },
    {
      id: 5, company: 'Local Auto Dealership', title: 'Commercial Shoot',
      type: 'Commercial', compensation: '$2,500 - $4,000', location: 'Dallas, TX',
      deadline: 'Apr 10, 2026', posted: '1 week ago', sport: 'Football',
      description: 'Looking for college football players for a TV commercial promoting our dealership.',
      saved: true,
    },
  ]);

  const toggleSave = (id: number) => {
    setOpportunities(prev =>
      prev.map(opp => opp.id === id ? { ...opp, saved: !opp.saved } : opp)
    );
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || opp.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white p-8" style={{ borderBottom: '1px solid #B4E2ED' }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>
            OPPORTUNITIES
          </h1>
          <p className="text-gray-600 mb-6">Discover sponsorship opportunities tailored for you</p>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunities..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] transition-colors text-gray-900"
              />
            </div>
            <select
              value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] transition-colors text-gray-900"
            >
              <option value="all">All Types</option>
              <option value="Brand Ambassador">Brand Ambassador</option>
              <option value="Social Media">Social Media</option>
              <option value="Event Appearance">Event Appearance</option>
              <option value="Product Review">Product Review</option>
              <option value="Commercial">Commercial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {filteredOpportunities.map((opp) => (
            <div key={opp.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {opp.title.toUpperCase()}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EFFAFC]" style={{ color: '#6CC3DA' }}>
                      {opp.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{opp.company}</span>
                  </div>
                </div>
                <button onClick={() => toggleSave(opp.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bookmark className={`w-5 h-5 ${opp.saved ? 'fill-[#6CC3DA] text-[#6CC3DA]' : 'text-gray-400'}`} />
                </button>
              </div>
              <p className="text-gray-600 mb-4">{opp.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <span className="flex items-center gap-2 font-bold" style={{ color: '#6CC3DA' }}>
                    <DollarSign className="w-4 h-4" />{opp.compensation}
                  </span>
                  <span className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-4 h-4" />{opp.location}
                  </span>
                  <span className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />Due: {opp.deadline}
                  </span>
                </div>
                <button className="px-6 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: '#6CC3DA', color: '#ffffff' }}>
                  APPLY NOW
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
