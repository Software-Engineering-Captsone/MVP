'use client';

import { useState } from 'react';
import { Building2, MapPin, Globe, Users, Star, Edit3, Save, Megaphone, Award, MessageSquare } from 'lucide-react';

export function BusinessProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    companyName: 'PowerFuel Energy',
    industry: 'Sports Nutrition',
    location: 'Austin, TX',
    website: 'www.powerfuelenergy.com',
    description: 'PowerFuel Energy is a leading sports nutrition brand dedicated to powering athletes at every level. We specialize in energy drinks, protein supplements, and recovery products designed for peak performance.',
    founded: '2018',
    employees: '50-100',
    campaignsRun: 12,
    athletePartnerships: 38,
    totalInvestment: '$185,000',
  });

  const campaigns = [
    { id: 1, name: 'Spring Training Fuel', status: 'Active', athletes: 8, budget: '$15,000' },
    { id: 2, name: 'Basketball Season Sponsorship', status: 'Active', athletes: 5, budget: '$25,000' },
    { id: 3, name: 'Track & Field Partnership', status: 'Active', athletes: 12, budget: '$10,000' },
  ];

  const testimonials = [
    { name: 'Marcus Johnson', sport: 'Basketball', text: 'Working with PowerFuel has been amazing. They truly care about their athlete partners.', rating: 5 },
    { name: 'Sarah Chen', sport: 'Soccer', text: 'Professional, supportive, and great products. Highly recommend partnering with them!', rating: 5 },
    { name: 'Tyler Washington', sport: 'Football', text: 'PowerFuel understands what athletes need. A great brand to work with.', rating: 4 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-5xl tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>
              BUSINESS PROFILE
            </h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#6CC3DA', color: '#ffffff' }}
            >
              {isEditing ? <><Save className="w-5 h-5" /> SAVE CHANGES</> : <><Edit3 className="w-5 h-5" /> EDIT PROFILE</>}
            </button>
          </div>

          {/* Company Card */}
          <div className="flex items-start gap-8">
            <div className="w-32 h-32 rounded-xl bg-[#6CC3DA] flex items-center justify-center text-white shadow-lg">
              <Building2 className="w-16 h-16" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text" value={profile.companyName}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  className="text-4xl font-bold border-b-2 border-[#6CC3DA] focus:outline-none text-gray-900 mb-2 w-full"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                />
              ) : (
                <h2 className="text-4xl font-bold mb-2 text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {profile.companyName.toUpperCase()}
                </h2>
              )}
              <div className="flex items-center gap-6 text-gray-600 mb-4">
                <span className="flex items-center gap-2"><Building2 className="w-4 h-4" />{profile.industry}</span>
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{profile.location}</span>
                <span className="flex items-center gap-2"><Globe className="w-4 h-4" />{profile.website}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Founded', value: profile.founded },
                  { label: 'Campaigns', value: profile.campaignsRun },
                  { label: 'Partnerships', value: profile.athletePartnerships },
                  { label: 'Investment', value: profile.totalInvestment },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold" style={{ color: '#6CC3DA' }}>{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* About */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-2xl mb-4 tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>ABOUT</h3>
          {isEditing ? (
            <textarea
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] resize-none text-gray-900"
            />
          ) : (
            <p className="text-gray-700 leading-relaxed">{profile.description}</p>
          )}
        </div>

        {/* Active Campaigns */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Megaphone className="w-6 h-6" style={{ color: '#6CC3DA' }} />
            <h3 className="text-2xl tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>ACTIVE CAMPAIGNS</h3>
          </div>
          <div className="space-y-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <h4 className="font-bold text-gray-900">{campaign.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600 flex items-center gap-1"><Users className="w-3 h-3" />{campaign.athletes} athletes</span>
                    <span className="text-sm font-bold" style={{ color: '#6CC3DA' }}>{campaign.budget}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">{campaign.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-6 h-6" style={{ color: '#6CC3DA' }} />
            <h3 className="text-2xl tracking-tight text-gray-900" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>ATHLETE TESTIMONIALS</h3>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {testimonials.map(testimonial => (
              <div key={testimonial.name} className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">&ldquo;{testimonial.text}&rdquo;</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.sport}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
