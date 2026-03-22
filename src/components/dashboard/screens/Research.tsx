'use client';

import { useState } from 'react';
import { Search, Filter, Heart, X, Users, Instagram, Music } from 'lucide-react';
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
  instagramFollowers: number;
  tiktokFollowers: number;
  engagementRate: number;
  compatibilityScore: number;
  priceRange: string;
  gender: 'Male' | 'Female';
  hasVideos: boolean;
  position: string;
  verified: boolean;
}

export function Research() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedAthletes, setSavedAthletes] = useState<number[]>([]);
  const [compareList, setCompareList] = useState<number[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  const [filters, setFilters] = useState({
    sport: '',
    school: '',
    location: '',
    minFollowers: '',
    maxFollowers: '',
    minEngagement: '',
    maxEngagement: '',
    minPrice: '',
    maxPrice: '',
    minCompatibility: '',
    gender: '',
    hasVideos: false,
  });

  const athletes: Athlete[] = [
    {
      id: 1, name: 'Marcus Johnson', sport: 'Basketball', school: 'State University',
      location: 'Texas', profileImage: 'https://images.unsplash.com/photo-1590156532211-69280532a54a?w=400',
      followers: 37900, instagramFollowers: 25000, tiktokFollowers: 15000,
      engagementRate: 8.5, compatibilityScore: 94, priceRange: '$500-$2000',
      gender: 'Male', hasVideos: true, position: 'Point Guard', verified: true,
    },
    {
      id: 2, name: 'Sarah Chen', sport: 'Soccer', school: 'Pacific University',
      location: 'California', profileImage: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400',
      followers: 28500, instagramFollowers: 18000, tiktokFollowers: 10000,
      engagementRate: 9.2, compatibilityScore: 88, priceRange: '$400-$1500',
      gender: 'Female', hasVideos: true, position: 'Forward', verified: false,
    },
    {
      id: 3, name: 'Tyler Washington', sport: 'Football', school: 'Central College',
      location: 'Ohio', profileImage: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400',
      followers: 45200, instagramFollowers: 30000, tiktokFollowers: 20000,
      engagementRate: 7.8, compatibilityScore: 91, priceRange: '$800-$3000',
      gender: 'Male', hasVideos: true, position: 'Quarterback', verified: true,
    },
    {
      id: 4, name: 'Emily Rodriguez', sport: 'Volleyball', school: 'Mountain State',
      location: 'Colorado', profileImage: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400',
      followers: 19800, instagramFollowers: 12000, tiktokFollowers: 8000,
      engagementRate: 10.5, compatibilityScore: 85, priceRange: '$300-$1200',
      gender: 'Female', hasVideos: false, position: 'Setter', verified: false,
    },
    {
      id: 5, name: 'Jordan Blake', sport: 'Basketball', school: 'Tech University',
      location: 'Georgia', profileImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
      followers: 15600, instagramFollowers: 10000, tiktokFollowers: 5000,
      engagementRate: 6.9, compatibilityScore: 79, priceRange: '$200-$800',
      gender: 'Female', hasVideos: true, position: 'Guard', verified: true,
    },
    {
      id: 6, name: 'Aisha Patel', sport: 'Tennis', school: 'Coastal Academy',
      location: 'Florida', profileImage: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400',
      followers: 32100, instagramFollowers: 20000, tiktokFollowers: 12000,
      engagementRate: 8.8, compatibilityScore: 92, priceRange: '$600-$2500',
      gender: 'Female', hasVideos: true, position: 'Singles', verified: false,
    },
    {
      id: 7, name: 'Chris Martinez', sport: 'Baseball', school: 'State University',
      location: 'Texas', profileImage: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400',
      followers: 22400, instagramFollowers: 15000, tiktokFollowers: 10000,
      engagementRate: 7.3, compatibilityScore: 83, priceRange: '$350-$1400',
      gender: 'Male', hasVideos: true, position: 'Pitcher', verified: true,
    },
    {
      id: 8, name: 'Maya Thompson', sport: 'Gymnastics', school: 'Elite Institute',
      location: 'California', profileImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
      followers: 51300, instagramFollowers: 35000, tiktokFollowers: 25000,
      engagementRate: 11.2, compatibilityScore: 96, priceRange: '$1000-$4000',
      gender: 'Female', hasVideos: true, position: 'All-Around', verified: true,
    },
  ];

  const toggleSave = (id: number) => {
    setSavedAthletes(prev =>
      prev.includes(id) ? prev.filter(athleteId => athleteId !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white p-8" style={{ borderBottom: '1px solid #B4E2ED' }}>
        <div className="max-w-7xl mx-auto">
          <h1
            className="text-5xl mb-2 tracking-wide leading-snug"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}
          >
            RESEARCH ATHLETES
          </h1>
          <p className="text-gray-600">Discover the perfect athlete partners for your brand</p>

          {/* Search and Filter Bar */}
          <div className="flex gap-4 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, sport, school..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] transition-colors text-gray-900"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                  <select
                    value={filters.sport}
                    onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] text-gray-900"
                  >
                    <option value="">All Sports</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Football">Football</option>
                    <option value="Soccer">Soccer</option>
                    <option value="Volleyball">Volleyball</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Baseball">Baseball</option>
                    <option value="Track & Field">Track &amp; Field</option>
                    <option value="Gymnastics">Gymnastics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
                  <input
                    type="text"
                    value={filters.school}
                    onChange={(e) => setFilters({ ...filters, school: e.target.value })}
                    placeholder="Enter school"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    placeholder="State/City"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={filters.gender}
                    onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] text-gray-900"
                  >
                    <option value="">All</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Compare Bar */}
          {compareList.length > 0 && (
            <div className="mt-4 p-4 bg-[#6CC3DA] rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Users className="w-5 h-5" />
                <span className="font-bold">{compareList.length} athletes selected for comparison</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCompareList([])}
                  className="px-4 py-2 bg-white text-[#6CC3DA] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
                <button className="px-4 py-2 bg-white text-[#6CC3DA] rounded-lg font-bold hover:bg-gray-100 transition-colors">
                  Compare Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Athlete Grid */}
      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4">
            {athletes.map((athlete) => (
              <div
                key={athlete.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer flex items-center gap-6"
                onClick={() => setSelectedAthlete(athlete)}
              >
                {/* Profile Image */}
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={athlete.profileImage}
                    alt={athlete.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Name and College */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className="text-2xl font-bold text-black"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {athlete.name}
                    </h3>
                    {athlete.verified && <VerifiedBadge className="w-5 h-5 text-[#6CC3DA] shrink-0" />}
                  </div>
                  <p className="text-gray-600">{athlete.school}</p>
                </div>

                {/* Followers */}
                <div className="text-center px-6">
                  <p className="text-sm text-gray-500 mb-1">Followers</p>
                  <p className="text-lg font-bold text-black">
                    {(athlete.followers / 1000).toFixed(1)}K
                  </p>
                </div>

                {/* Engagement */}
                <div className="text-center px-6">
                  <p className="text-sm text-gray-500 mb-1">Engagement</p>
                  <p className="text-lg font-bold text-black">
                    {athlete.engagementRate}%
                  </p>
                </div>

                {/* Price Range */}
                <div className="text-center px-6">
                  <p className="text-sm text-gray-500 mb-1">Est. Price</p>
                  <p className="text-lg font-bold text-black">{athlete.priceRange}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Athlete Preview Modal */}
      {selectedAthlete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedAthlete(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2
                className="text-3xl"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}
              >
                ATHLETE PREVIEW
              </h2>
              <button
                onClick={() => setSelectedAthlete(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex gap-6 mb-6">
                <div className="w-48 h-48 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={selectedAthlete.profileImage}
                    alt={selectedAthlete.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-4xl font-bold text-black leading-snug"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        {selectedAthlete.name.toUpperCase()}
                      </h3>
                      {selectedAthlete.verified && <VerifiedBadge className="w-6 h-6 text-[#6CC3DA] shrink-0" />}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(selectedAthlete.id);
                      }}
                      className={`p-3 rounded-lg transition-colors ${
                        savedAthletes.includes(selectedAthlete.id)
                          ? 'bg-[#6CC3DA] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={savedAthletes.includes(selectedAthlete.id) ? 'Remove from saved' : 'Save athlete'}
                    >
                      <Heart className={`w-6 h-6 ${savedAthletes.includes(selectedAthlete.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <p className="text-lg text-gray-700 mb-1">
                    <span className="font-bold">{selectedAthlete.position}</span> • {selectedAthlete.sport}
                  </p>
                  <p className="text-gray-600 mb-4">{selectedAthlete.school} • {selectedAthlete.location}</p>

                  {/* Social Media Breakdown */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <p className="text-xs text-gray-500 font-bold">Instagram Followers</p>
                      </div>
                      <p className="text-2xl font-bold text-black">
                        {(selectedAthlete.instagramFollowers / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="w-4 h-4 text-black" />
                        <p className="text-xs text-gray-500 font-bold">TikTok Followers</p>
                      </div>
                      <p className="text-2xl font-bold text-black">
                        {(selectedAthlete.tiktokFollowers / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>

                  {/* Engagement and Compatibility */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1 font-bold">Engagement Rate</p>
                      <p className="text-2xl font-bold text-black">
                        {selectedAthlete.engagementRate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1 font-bold">Compatibility</p>
                      <p className="text-2xl font-bold text-black">
                        {selectedAthlete.compatibilityScore}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 px-6 py-3 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#6CC3DA' }}
                >
                  VIEW FULL PROFILE
                </button>
                <button className="flex-1 px-6 py-3 rounded-lg font-bold border-2 hover:bg-gray-50 transition-colors text-gray-700"
                  style={{ borderColor: '#6CC3DA' }}
                >
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
