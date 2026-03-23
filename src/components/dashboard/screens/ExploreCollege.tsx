'use client';

import { useState } from 'react';
import { Search, MapPin, Users, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface College {
  id: number;
  name: string;
  mascot: string;
  location: string;
  state: string;
  division: string;
  athleteCount: number;
  avgEngagement: number;
  logo: string;
  color: string;
}

export function ExploreCollege() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedState, setSelectedState] = useState('all');

  const colleges: College[] = [
    { id: 1, name: 'State University', mascot: 'Wildcats', location: 'Austin, TX', state: 'Texas', division: 'Division I', athleteCount: 127, avgEngagement: 8.5, logo: '🐱', color: '#6366F1' },
    { id: 2, name: 'Pacific University', mascot: 'Eagles', location: 'San Diego, CA', state: 'California', division: 'Division I', athleteCount: 98, avgEngagement: 9.2, logo: '🦅', color: '#EF4444' },
    { id: 3, name: 'Central College', mascot: 'Bears', location: 'Columbus, OH', state: 'Ohio', division: 'Division II', athleteCount: 84, avgEngagement: 7.8, logo: '🐻', color: '#F59E0B' },
    { id: 4, name: 'Mountain State', mascot: 'Rams', location: 'Denver, CO', state: 'Colorado', division: 'Division I', athleteCount: 112, avgEngagement: 8.9, logo: '🐏', color: '#10B981' },
    { id: 5, name: 'Tech University', mascot: 'Yellow Jackets', location: 'Atlanta, GA', state: 'Georgia', division: 'Division I', athleteCount: 156, avgEngagement: 9.5, logo: '🐝', color: '#FBBF24' },
    { id: 6, name: 'Coastal Academy', mascot: 'Dolphins', location: 'Miami, FL', state: 'Florida', division: 'Division I', athleteCount: 143, avgEngagement: 10.1, logo: '🐬', color: '#06B6D4' },
    { id: 7, name: 'Elite Institute', mascot: 'Spartans', location: 'Los Angeles, CA', state: 'California', division: 'Division I', athleteCount: 189, avgEngagement: 9.8, logo: '⚔️', color: '#8B5CF6' },
    { id: 8, name: 'Northern University', mascot: 'Huskies', location: 'Seattle, WA', state: 'Washington', division: 'Division I', athleteCount: 134, avgEngagement: 8.7, logo: '🐺', color: '#6366F1' },
    { id: 9, name: 'Eastern College', mascot: 'Tigers', location: 'Boston, MA', state: 'Massachusetts', division: 'Division II', athleteCount: 76, avgEngagement: 7.5, logo: '🐯', color: '#F97316' },
    { id: 10, name: 'Southern State', mascot: 'Bulldogs', location: 'Athens, GA', state: 'Georgia', division: 'Division I', athleteCount: 167, avgEngagement: 9.3, logo: '🐶', color: '#DC2626' },
  ];

  const filteredColleges = colleges.filter(college => {
    const matchesSearch = college.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      college.mascot.toLowerCase().includes(searchQuery.toLowerCase()) ||
      college.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDivision = selectedDivision === 'all' || college.division === selectedDivision;
    const matchesState = selectedState === 'all' || college.state === selectedState;
    return matchesSearch && matchesDivision && matchesState;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl mb-2 tracking-wide leading-snug" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>
            EXPLORE COLLEGES
          </h1>
          <p className="text-gray-600 mb-6">Discover athletes by searching colleges and universities</p>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search colleges, mascots, or locations..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
              <select value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent text-gray-900"
              >
                <option value="all">All Divisions</option>
                <option value="Division I">Division I</option>
                <option value="Division II">Division II</option>
                <option value="Division III">Division III</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent text-gray-900"
              >
                <option value="all">All States</option>
                <option value="California">California</option>
                <option value="Texas">Texas</option>
                <option value="Florida">Florida</option>
                <option value="Georgia">Georgia</option>
                <option value="Ohio">Ohio</option>
                <option value="Colorado">Colorado</option>
                <option value="Washington">Washington</option>
                <option value="Massachusetts">Massachusetts</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600">Showing <span className="font-bold text-gray-900">{filteredColleges.length}</span> colleges</p>
          </div>
        </div>
      </div>

      {/* College Grid */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-5 gap-4">
            {filteredColleges.map(college => (
              <div
                key={college.id}
                onClick={() => router.push(`/dashboard/college/${college.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${college.color}20` }}
                >
                  {college.logo}
                </div>
                <h3 className="text-base font-bold mb-1 text-gray-900 line-clamp-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {college.name.toUpperCase()}
                </h3>
                <p className="text-xs text-gray-600 mb-2">{college.mascot}</p>
                <div className="flex items-center gap-1 mb-3">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500">{college.location}</p>
                </div>
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-500">Athletes</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#6CC3DA' }}>{college.athleteCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-500">Avg. Eng.</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#6CC3DA' }}>{college.avgEngagement}%</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: college.color }}>
                    {college.division.replace('Division ', 'D-')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
