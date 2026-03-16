'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Users, TrendingUp, Filter, Heart, BarChart3, GraduationCap } from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';

interface Athlete {
  id: number;
  name: string;
  sport: string;
  position: string;
  year: string;
  profileImage: string;
  followers: number;
  engagementRate: number;
  compatibilityScore: number;
  priceRange: string;
  gender: 'Male' | 'Female';
  hasVideos: boolean;
}

export function CollegeDetail() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [savedAthletes, setSavedAthletes] = useState<number[]>([]);

  // Static college data since we don't have route state in Next.js
  const college = {
    id: 1, name: 'State University', mascot: 'Wildcats', location: 'Austin, TX',
    state: 'Texas', division: 'Division I', athleteCount: 127, avgEngagement: 8.5,
    logo: '🐱', color: '#6366F1',
  };

  const athletes: Athlete[] = [
    { id: 1, name: 'Marcus Johnson', sport: 'Basketball', position: 'Point Guard', year: 'Junior', profileImage: 'https://images.unsplash.com/photo-1590156532211-69280532a54a?w=400', followers: 37900, engagementRate: 8.5, compatibilityScore: 94, priceRange: '$500-$2000', gender: 'Male', hasVideos: true },
    { id: 2, name: 'Sarah Chen', sport: 'Soccer', position: 'Forward', year: 'Senior', profileImage: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400', followers: 28500, engagementRate: 9.2, compatibilityScore: 88, priceRange: '$400-$1500', gender: 'Female', hasVideos: true },
    { id: 3, name: 'Tyler Washington', sport: 'Football', position: 'Quarterback', year: 'Sophomore', profileImage: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400', followers: 45200, engagementRate: 7.8, compatibilityScore: 91, priceRange: '$800-$3000', gender: 'Male', hasVideos: true },
    { id: 4, name: 'Emily Rodriguez', sport: 'Volleyball', position: 'Setter', year: 'Junior', profileImage: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400', followers: 19800, engagementRate: 10.5, compatibilityScore: 85, priceRange: '$300-$1200', gender: 'Female', hasVideos: false },
    { id: 5, name: 'Jordan Blake', sport: 'Track & Field', position: 'Sprinter', year: 'Freshman', profileImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400', followers: 15600, engagementRate: 6.9, compatibilityScore: 79, priceRange: '$200-$800', gender: 'Male', hasVideos: true },
    { id: 6, name: 'Aisha Patel', sport: 'Tennis', position: 'Singles', year: 'Senior', profileImage: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400', followers: 32100, engagementRate: 8.8, compatibilityScore: 92, priceRange: '$600-$2500', gender: 'Female', hasVideos: true },
    { id: 7, name: 'Chris Martinez', sport: 'Baseball', position: 'Pitcher', year: 'Junior', profileImage: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400', followers: 22400, engagementRate: 7.3, compatibilityScore: 83, priceRange: '$350-$1400', gender: 'Male', hasVideos: true },
    { id: 8, name: 'Maya Thompson', sport: 'Gymnastics', position: 'All-Around', year: 'Sophomore', profileImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', followers: 51300, engagementRate: 11.2, compatibilityScore: 96, priceRange: '$1000-$4000', gender: 'Female', hasVideos: true },
  ];

  const filteredAthletes = athletes.filter(athlete => {
    const matchesSport = selectedSport === 'all' || athlete.sport === selectedSport;
    const matchesYear = selectedYear === 'all' || athlete.year === selectedYear;
    const matchesGender = selectedGender === 'all' || athlete.gender === selectedGender;
    return matchesSport && matchesYear && matchesGender;
  });

  const toggleSave = (id: number) => {
    setSavedAthletes(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => router.push('/dashboard/college')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back to Colleges</span>
          </button>

          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 rounded-xl flex items-center justify-center text-5xl shadow-lg" style={{ backgroundColor: `${college.color}20` }}>
              {college.logo}
            </div>
            <div className="flex-1">
              <h1 className="text-5xl mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>
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

          <div className="flex gap-4">
            <select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] text-gray-900">
              <option value="all">All Sports</option>
              <option value="Basketball">Basketball</option><option value="Football">Football</option><option value="Soccer">Soccer</option>
              <option value="Volleyball">Volleyball</option><option value="Tennis">Tennis</option><option value="Baseball">Baseball</option>
              <option value="Track & Field">Track &amp; Field</option><option value="Gymnastics">Gymnastics</option>
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] text-gray-900">
              <option value="all">All Years</option><option value="Freshman">Freshman</option><option value="Sophomore">Sophomore</option><option value="Junior">Junior</option><option value="Senior">Senior</option>
            </select>
            <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] text-gray-900">
              <option value="all">All Genders</option><option value="Male">Male</option><option value="Female">Female</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-6">
            {filteredAthletes.map(athlete => (
              <div key={athlete.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
                <div className="relative h-64 overflow-hidden">
                  <ImageWithFallback src={athlete.profileImage} alt={athlete.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-3 right-3">
                    <button onClick={(e) => { e.stopPropagation(); toggleSave(athlete.id); }}
                      className={`p-2 rounded-full backdrop-blur-sm transition-colors ${savedAthletes.includes(athlete.id) ? 'bg-[#6CC3DA] text-white' : 'bg-white/90 text-gray-600 hover:bg-white'}`}
                    >
                      <Heart className={`w-4 h-4 ${savedAthletes.includes(athlete.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full backdrop-blur-sm bg-white/90 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#6CC3DA' }} />
                    <span className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{athlete.compatibilityScore}%</span>
                  </div>
                  {athlete.hasVideos && (
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded backdrop-blur-sm bg-black/70 text-white text-xs font-bold">VIDEO</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-1 text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {athlete.name.toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">{athlete.position} • {athlete.sport}</p>
                  <p className="text-sm text-gray-500 mb-3">{athlete.year}</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1 mb-1"><Users className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-500">Followers</span></div>
                      <p className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{(athlete.followers / 1000).toFixed(1)}K</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1"><BarChart3 className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-500">Engagement</span></div>
                      <p className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{athlete.engagementRate}%</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Estimated Range</p>
                    <p className="text-sm font-bold text-gray-900">{athlete.priceRange}</p>
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
