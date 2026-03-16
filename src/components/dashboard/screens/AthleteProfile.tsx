'use client';

import { Instagram, Award, TrendingUp, Calendar, MapPin, Users, BarChart3, Heart } from 'lucide-react';
import { useState } from 'react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';

export function AthleteProfile() {
  const [isOpenToDeals, setIsOpenToDeals] = useState(true);

  const athlete = {
    name: 'Marcus Johnson',
    sport: 'Basketball',
    position: 'Point Guard',
    school: 'State University',
    year: 'Junior',
    bio: 'Dynamic point guard with a passion for community engagement and building my personal brand. I bring authentic energy to every partnership and believe in creating genuine connections with brands that align with my values. On and off the court, I strive for excellence in everything I do.',
    compatibilityScore: 94,
    bannerImage: 'https://images.unsplash.com/photo-1767016697775-001518392206?w=1080',
    profileImage: 'https://images.unsplash.com/photo-1590156552211-69280532a54a?w=1080',
    socialStats: {
      instagram: { handle: '@marcusj_hoops', followers: '12.5K', postsPerMonth: 18, engagementRate: '7.2%' },
      tiktok: { handle: '@marcusj23', followers: '25.4K', postsPerMonth: 24, engagementRate: '9.8%' },
    },
    achievements: [
      '2x All-Conference Selection (2024, 2025)', 'Team Captain - 2025 Season',
      'Academic All-American - 3.8 GPA', 'Conference Rookie of the Year - 2024',
      'Led team in assists (6.2 APG) - 2025', 'Community Leadership Award - 2025',
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Image */}
      <div className="relative h-80 w-full">
        <ImageWithFallback src={athlete.bannerImage} alt="Profile Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white"></div>
      </div>

      {/* Profile Header Section */}
      <div className="max-w-6xl mx-auto px-8 -mt-32 relative z-10">
        <div className="flex items-end gap-8 mb-8">
          <div className="relative">
            <div className="w-48 h-48 rounded-2xl overflow-hidden border-4 border-white shadow-2xl">
              <ImageWithFallback src={athlete.profileImage} alt={athlete.name} className="w-full h-full object-cover" />
            </div>
            {isOpenToDeals && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-bold text-xs shadow-lg whitespace-nowrap" style={{ backgroundColor: '#6CC3DA', color: '#ffffff' }}>
                ✓ OPEN TO DEALS
              </div>
            )}
          </div>

          <div className="flex-1 pb-4">
            <h1 className="text-7xl mb-2 tracking-tight leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: '#6CC3DA' }}>
              {athlete.name.toUpperCase()}
            </h1>
            <div className="flex items-center gap-6 text-lg text-gray-700 mb-4">
              <span className="flex items-center gap-2">
                <span className="font-bold" style={{ color: '#6CC3DA' }}>{athlete.position}</span>
                • {athlete.sport}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: '#6CC3DA' }} />{athlete.school}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: '#6CC3DA' }} />{athlete.year}
              </span>
            </div>

            <div className="inline-flex items-center gap-3 bg-white border-2 border-[#6CC3DA] rounded-xl px-6 py-3 shadow-sm">
              <TrendingUp className="w-6 h-6" style={{ color: '#6CC3DA' }} />
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Compatibility Score</p>
                <p className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>{athlete.compatibilityScore}%</p>
              </div>
              <div className="ml-2 px-3 py-1 bg-[#6CC3DA] rounded-full">
                <p className="text-xs font-bold text-white">EXCELLENT MATCH</p>
              </div>
            </div>
          </div>

          <div className="pb-4">
            <button className="px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#6CC3DA', color: '#ffffff' }}>
              CONNECT NOW
            </button>
          </div>
        </div>

        {/* Bio Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
          <h2 className="text-3xl mb-4 tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>ABOUT</h2>
          <p className="text-gray-700 text-lg leading-relaxed">{athlete.bio}</p>
        </div>

        {/* Social Media Stats */}
        <div className="mb-8">
          <h2 className="text-3xl mb-6 tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>SOCIAL MEDIA REACH</h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Instagram */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-[#6CC3DA]/50 transition-all shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl"><Instagram className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-2xl tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>INSTAGRAM</h3>
                  <p className="text-sm text-gray-600">{athlete.socialStats.instagram.handle}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4" style={{ color: '#6CC3DA' }} /><p className="text-xs text-gray-500 uppercase">Followers</p></div>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>{athlete.socialStats.instagram.followers}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4" style={{ color: '#6CC3DA' }} /><p className="text-xs text-gray-500 uppercase">Posts/Mo</p></div>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>{athlete.socialStats.instagram.postsPerMonth}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><Heart className="w-4 h-4" style={{ color: '#6CC3DA' }} /><p className="text-xs text-gray-500 uppercase">Engagement</p></div>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>{athlete.socialStats.instagram.engagementRate}</p>
                </div>
              </div>
            </div>

            {/* TikTok */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-[#6CC3DA]/50 transition-all shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-cyan-400 to-pink-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
                </div>
                <div>
                  <h3 className="text-2xl tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>TIKTOK</h3>
                  <p className="text-sm text-gray-600">{athlete.socialStats.tiktok.handle}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4" style={{ color: '#6CC3DA' }} /><p className="text-xs text-gray-500 uppercase">Followers</p></div>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>{athlete.socialStats.tiktok.followers}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4" style={{ color: '#6CC3DA' }} /><p className="text-xs text-gray-500 uppercase">Posts/Mo</p></div>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>{athlete.socialStats.tiktok.postsPerMonth}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><Heart className="w-4 h-4" style={{ color: '#6CC3DA' }} /><p className="text-xs text-gray-500 uppercase">Engagement</p></div>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>{athlete.socialStats.tiktok.engagementRate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Stats Summary */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[{ label: 'Total Reach', value: '37.9K' }, { label: 'Avg. Engagement', value: '8.5%' }, { label: 'Monthly Posts', value: '42' }, { label: 'Est. Impressions', value: '284K' }].map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <p className="text-xs text-gray-500 uppercase mb-2">{stat.label}</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements Section */}
        <div className="mb-8">
          <h2 className="text-3xl mb-6 tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>ACHIEVEMENTS & HONORS</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              {athlete.achievements.map((achievement, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Award className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#6CC3DA' }} />
                  <p className="text-gray-700 leading-relaxed">{achievement}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="mb-12 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl mb-2 tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>DEAL AVAILABILITY</h3>
              <p className="text-gray-600">Let businesses know you&apos;re currently accepting new sponsorship opportunities</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`font-bold ${isOpenToDeals ? 'text-[#6CC3DA]' : 'text-gray-500'}`}>
                {isOpenToDeals ? 'OPEN TO DEALS' : 'NOT AVAILABLE'}
              </span>
              <button
                onClick={() => setIsOpenToDeals(!isOpenToDeals)}
                className={`relative w-16 h-8 rounded-full transition-colors ${isOpenToDeals ? 'bg-[#6CC3DA]' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform shadow ${isOpenToDeals ? 'translate-x-9' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
