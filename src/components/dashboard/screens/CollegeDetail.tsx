'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Users, TrendingUp, Heart, BarChart3, GraduationCap } from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { mockAthletes, type Athlete } from '@/lib/mockData';
import { useSavedMarketplace } from '@/hooks/useSavedMarketplace';

export function CollegeDetail() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const { isAthleteSaved, toggleAthlete } = useSavedMarketplace();

  const college = {
    id: 1, name: 'State University', mascot: 'Wildcats', location: 'Austin, TX',
    state: 'Texas', division: 'Division I', athleteCount: mockAthletes.length, avgEngagement: 8.5,
    logo: '🐱', color: '#6366F1',
  };

  const filteredAthletes = mockAthletes.filter((athlete: Athlete) => {
    const matchesSport = selectedSport === 'all' || athlete.sport === selectedSport;
    const matchesYear = selectedYear === 'all' || athlete.academicYear === selectedYear;
    return matchesSport && matchesYear;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => router.push('/dashboard/college')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back to Colleges</span>
          </button>

          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 rounded-xl flex items-center justify-center text-5xl shadow-lg leading-snug" style={{ backgroundColor: `${college.color}20` }}>
              {college.logo}
            </div>
            <div className="flex-1">
              <h1 className="text-5xl mb-2 tracking-wide leading-snug" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>
                {college.name.toUpperCase()}
              </h1>
              <div className="flex items-center gap-4 text-lg text-gray-700 mb-3">
                <span className="font-bold">{college.mascot}</span>
                <span className="flex items-center gap-2"><MapPin className="w-5 h-5" style={{ color: '#6CC3DA' }} />{college.location}</span>
                <span className="px-3 py-1 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: college.color }}>{college.division}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600"><span className="font-bold text-gray-900">{college.athleteCount}</span> Athletes</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600"><span className="font-bold text-gray-900">{college.avgEngagement}%</span> Avg. Engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600"><span className="font-bold text-gray-900">{filteredAthletes.length}</span> Showing</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent text-gray-900">
              <option value="all">All Sports</option>
              {[...new Set(mockAthletes.map((a) => a.sport))].sort().map((sport) => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent text-gray-900">
              <option value="all">All Years</option>
              <option value="Freshman">Freshman</option>
              <option value="Redshirt Freshman">Redshirt Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-6">
            {filteredAthletes.map((athlete) => (
              <div
                key={athlete.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/profile/view?id=${athlete.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/dashboard/profile/view?id=${athlete.id}`);
                  }
                }}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:shadow-lg cursor-pointer"
              >
                <div className="relative h-64 overflow-hidden">
                  <ImageWithFallback src={athlete.image} alt={athlete.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAthlete(athlete.id);
                      }}
                      title={isAthleteSaved(athlete.id) ? 'Remove from saved' : 'Save athlete'}
                      className={`rounded-full p-2 backdrop-blur-sm transition-colors ${isAthleteSaved(athlete.id) ? 'bg-nilink-accent text-white' : 'bg-white/90 text-gray-600 hover:bg-white'}`}
                    >
                      <Heart className={`w-4 h-4 ${isAthleteSaved(athlete.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full backdrop-blur-sm bg-white/90 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#6CC3DA' }} />
                    <span className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{athlete.compatibilityScore}%</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-1 text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {athlete.name.toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">{athlete.position} • {athlete.sport}</p>
                  <p className="text-sm text-gray-500 mb-3">{athlete.academicYear}</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1 mb-1"><Users className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-500">Followers</span></div>
                      <p className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{athlete.aggregate.totalFollowers}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1"><BarChart3 className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-500">Engagement</span></div>
                      <p className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{athlete.aggregate.engagementRate}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">NIL score</p>
                    <p className="text-sm font-bold text-gray-900">{athlete.nilScore}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
