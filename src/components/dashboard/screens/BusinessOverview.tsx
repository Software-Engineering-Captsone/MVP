'use client';

import { useState } from 'react';
import { Search, Filter, TrendingUp, MapPin, Target, Users, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

interface Athlete {
  id: number;
  name: string;
  sport: string;
  school: string;
  location: string;
  profileImage: string;
  followers: number;
  engagementRate: number;
  compatibilityScore: number;
  priceRange: string;
  verified: boolean;
}

const CATEGORIES = [
  { label: 'Basketball', icon: '🏀' },
  { label: 'Football', icon: '🏈' },
  { label: 'High Engagement', icon: '📈' },
  { label: 'Local to Texas', icon: '📍' },
  { label: 'Female Athletes', icon: '♀️' },
  { label: 'Top Rising', icon: '🚀' },
];

export function BusinessOverview() {
  const [searchQuery, setSearchQuery] = useState('');

  // Reusing data from Research.tsx for consistent UI experience
  const recommendedAthletes: Athlete[] = [
    {
      id: 1, name: 'Marcus Johnson', sport: 'Basketball', school: 'State University',
      location: 'Texas', profileImage: 'https://images.unsplash.com/photo-1590156532211-69280532a54a?w=400',
      followers: 37900, engagementRate: 8.5, compatibilityScore: 94, priceRange: '$500-$2000', verified: true,
    },
    {
      id: 8, name: 'Maya Thompson', sport: 'Gymnastics', school: 'Elite Institute',
      location: 'California', profileImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
      followers: 51300, engagementRate: 11.2, compatibilityScore: 96, priceRange: '$1000-$4000', verified: true,
    },
    {
      id: 6, name: 'Aisha Patel', sport: 'Tennis', school: 'Coastal Academy',
      location: 'Florida', profileImage: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400',
      followers: 32100, engagementRate: 8.8, compatibilityScore: 92, priceRange: '$600-$2500', verified: false,
    },
    {
      id: 3, name: 'Tyler Washington', sport: 'Football', school: 'Central College',
      location: 'Ohio', profileImage: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400',
      followers: 45200, engagementRate: 7.8, compatibilityScore: 91, priceRange: '$800-$3000', verified: true,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-auto font-sans">
      {/* Hero Section */}
      <div className="relative bg-[#0F172A] text-white pt-20 pb-28 px-8 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4">
          <div className="w-[700px] h-[700px] bg-[#6CC3DA] rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-normal uppercase mb-4 leading-snug" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Welcome back, <span className="text-[#6CC3DA]">PowerFuel Energy</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium tracking-wide">
            Discover the perfect athlete partners to elevate your brand's reach and engagement.
          </p>

          {/* Epic Search Bar */}
          <div className="bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/10 max-w-4xl mx-auto flex items-center transition-all hover:bg-white/10 hover:border-white/20 shadow-2xl">
            <Search className="w-6 h-6 text-gray-400 ml-5 mr-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search athletes by name, sport, or school..."
              className="flex-1 bg-transparent border-none text-white text-lg placeholder-gray-500 font-medium focus:outline-none focus:ring-0 px-2 py-4"
            />
            <button className="bg-[#6CC3DA] hover:bg-white hover:text-[#0F172A] text-[#0F172A] font-black tracking-widest uppercase py-4 px-10 rounded-xl transition-all shadow-[0_0_20px_rgba(108,195,218,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] flex items-center gap-3">
              Find <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Categories */}
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-semibold tracking-wide hover:bg-white hover:text-[#0F172A] transition-all flex items-center gap-3 group"
              >
                <span className="opacity-70 group-hover:opacity-100 transition-opacity">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-8 py-12 -mt-16 relative z-20">
        
        {/* Recommended Athletes Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-xl shadow-black/5 border border-gray-100">
            <div>
              <h2 className="text-4xl font-black text-[#0F172A] tracking-normal leading-snug" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                RECOMMENDED FOR YOUR BRAND
              </h2>
              <p className="text-gray-500 font-medium mt-1">Athletes with high compatibility based on your industry and goals.</p>
            </div>
            <button className="text-[#0F172A] font-black uppercase tracking-widest text-sm hover:text-[#6CC3DA] transition-colors flex items-center gap-2">
              View All <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Horizontal Scroll / Grid for Athletes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {recommendedAthletes.map((athlete) => (
              <div 
                key={athlete.id} 
                className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden group cursor-pointer flex flex-col"
              >
                {/* Image Header */}
                <div className="h-64 relative overflow-hidden bg-gray-100">
                  <ImageWithFallback
                    src={athlete.profileImage}
                    alt={athlete.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 mix-blend-multiply"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-500" />
                  
                  {/* Compatibility Badge */}
                  <div className="absolute top-4 right-4 bg-[#6CC3DA] px-4 py-1.5 rounded-full text-xs font-black text-[#0F172A] uppercase tracking-wider shadow-lg flex items-center gap-2 transform translate-y-0 group-hover:-translate-y-1 transition-transform border border-[#6CC3DA]/50">
                    <Target className="w-4 h-4" />
                    {athlete.compatibilityScore}% Match
                  </div>

                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-2 mb-1">
                       <h3 className="text-3xl font-black text-white leading-tight uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        {athlete.name}
                      </h3>
                      {athlete.verified && <VerifiedBadge className="w-5 h-5 text-[#6CC3DA] drop-shadow-md shrink-0" />}
                    </div>
                    <p className="text-[#6CC3DA] text-sm font-bold tracking-wide">{athlete.sport} <span className="text-gray-400 mx-1">•</span> <span className="text-gray-300">{athlete.school}</span></p>
                  </div>
                </div>

                {/* Stats Body */}
                <div className="p-6 flex-1 flex flex-col bg-white">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 group-hover:border-[#6CC3DA]/30 transition-colors">
                      <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-widest">Followers</p>
                      <p className="text-xl font-black text-[#0F172A] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#6CC3DA]" />
                        {(athlete.followers / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 group-hover:border-[#6CC3DA]/30 transition-colors">
                      <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-widest">Engagement</p>
                      <p className="text-xl font-black text-[#0F172A] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#6CC3DA]" />
                        {athlete.engagementRate}%
                      </p>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-auto flex items-center justify-between pt-4 border-t-2 border-dashed border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Price Range</p>
                      <p className="text-sm font-bold text-[#0F172A]">{athlete.priceRange}</p>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center group-hover:bg-[#6CC3DA] group-hover:text-[#0F172A] transition-colors shadow-lg">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / Recent Activity Dashboard Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#0F172A] p-8 rounded-2xl shadow-xl flex items-center justify-between group cursor-pointer hover:bg-black transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#6CC3DA]/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 group-hover:scale-110 group-hover:bg-[#6CC3DA] group-hover:text-[#0F172A] group-hover:border-transparent transition-all duration-300">
                <Target className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-white tracking-normal" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>ACTIVE CAMPAIGNS</h4>
                <p className="text-sm text-gray-400 font-medium">You have 3 active campaigns currently running.</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors group-hover:translate-x-2 relative z-10" />
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:border-[#6CC3DA]/50 transition-colors">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-[#0F172A] border border-gray-100 group-hover:scale-110 group-hover:bg-[#6CC3DA] group-hover:border-[#6CC3DA] group-hover:text-[#0F172A] transition-all duration-300">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-[#0F172A] tracking-normal" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SAVED ATHLETES</h4>
                <p className="text-sm text-gray-500 font-medium">12 athletes saved for future opportunities.</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-[#0F172A] transition-colors group-hover:translate-x-2" />
          </div>
        </div>

      </div>
    </div>
  );
}
