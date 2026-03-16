'use client';

import { useState } from 'react';
import { Search, Heart, Users, TrendingUp, MapPin, BarChart3, X } from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';

interface Athlete {
  id: number;
  name: string;
  sport: string;
  school: string;
  profileImage: string;
  followers: number;
  engagementRate: number;
  compatibilityScore: number;
  priceRange: string;
  savedDate: string;
  notes: string;
}

export function SavedAthletes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  const savedAthletes: Athlete[] = [
    {
      id: 1, name: 'Marcus Johnson', sport: 'Basketball', school: 'State University',
      profileImage: 'https://images.unsplash.com/photo-1590156532211-69280532a54a?w=400',
      followers: 37900, engagementRate: 8.5, compatibilityScore: 94, priceRange: '$500-$2000',
      savedDate: 'Mar 1, 2026', notes: 'Great engagement, perfect for basketball campaigns',
    },
    {
      id: 2, name: 'Sarah Chen', sport: 'Soccer', school: 'Pacific University',
      profileImage: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400',
      followers: 28500, engagementRate: 9.2, compatibilityScore: 88, priceRange: '$400-$1500',
      savedDate: 'Feb 28, 2026', notes: 'High engagement rate, authentic content creator',
    },
    {
      id: 3, name: 'Tyler Washington', sport: 'Football', school: 'Central College',
      profileImage: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400',
      followers: 45200, engagementRate: 7.8, compatibilityScore: 91, priceRange: '$800-$3000',
      savedDate: 'Feb 25, 2026', notes: 'Large following, great for broad reach campaigns',
    },
    {
      id: 4, name: 'Maya Thompson', sport: 'Gymnastics', school: 'Elite Institute',
      profileImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
      followers: 51300, engagementRate: 11.2, compatibilityScore: 96, priceRange: '$1000-$4000',
      savedDate: 'Feb 20, 2026', notes: 'Exceptional engagement, premium partnership potential',
    },
    {
      id: 5, name: 'Aisha Patel', sport: 'Tennis', school: 'Coastal Academy',
      profileImage: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400',
      followers: 32100, engagementRate: 8.8, compatibilityScore: 92, priceRange: '$600-$2500',
      savedDate: 'Feb 18, 2026', notes: 'Professional content, strong brand alignment',
    },
  ];

  const filteredAthletes = savedAthletes.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.sport.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white p-8" style={{ borderBottom: '1px solid #B4E2ED' }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>
            SAVED ATHLETES
          </h1>
          <p className="text-gray-600 mb-6">Athletes you&apos;ve bookmarked for future partnerships</p>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved athletes..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] transition-colors text-gray-900"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{filteredAthletes.length}</span> saved athletes
            </p>
          </div>
        </div>
      </div>

      {/* Athletes Grid */}
      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            {filteredAthletes.map((athlete) => (
              <div
                key={athlete.id}
                onClick={() => setSelectedAthlete(athlete)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex p-6 gap-5">
                  <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                    <ImageWithFallback src={athlete.profileImage} alt={athlete.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {athlete.name.toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600">{athlete.sport} • {athlete.school}</p>
                      </div>
                      <Heart className="w-5 h-5 fill-[#6CC3DA] text-[#6CC3DA]" />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Followers</p>
                        <p className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{(athlete.followers / 1000).toFixed(1)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Engagement</p>
                        <p className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{athlete.engagementRate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Match</p>
                        <p className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{athlete.compatibilityScore}%</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-3">Saved {athlete.savedDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Athlete Detail Modal */}
      {selectedAthlete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8" onClick={() => setSelectedAthlete(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-3xl" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>
                {selectedAthlete.name.toUpperCase()}
              </h2>
              <button onClick={() => setSelectedAthlete(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <ImageWithFallback src={selectedAthlete.profileImage} alt={selectedAthlete.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-gray-600">{selectedAthlete.sport} • {selectedAthlete.school}</p>
                  <p className="text-sm font-bold">{selectedAthlete.priceRange}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Your Notes</h3>
                <p className="text-gray-700">{selectedAthlete.notes}</p>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 px-6 py-3 rounded-lg font-bold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#6CC3DA' }}>
                  VIEW FULL PROFILE
                </button>
                <button className="flex-1 px-6 py-3 rounded-lg font-bold border-2 hover:bg-gray-50 transition-colors text-gray-700" style={{ borderColor: '#6CC3DA' }}>
                  SEND OPPORTUNITY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
