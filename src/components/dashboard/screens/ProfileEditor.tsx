'use client';

import { Save, Upload, Instagram, Twitter, TrendingUp, Eye } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export function ProfileEditor() {
  const [formData, setFormData] = useState({
    name: 'Marcus Johnson',
    sport: 'Basketball',
    position: 'Point Guard',
    school: 'State University',
    year: 'Junior',
    bio: 'Dynamic point guard with a passion for community engagement and building my personal brand.',
    achievements: '2x All-Conference, Team Captain, 3.8 GPA',
    instagram: '@marcusj_hoops',
    instagramFollowers: '12,500',
    twitter: '@MarcusJHoops',
    twitterFollowers: '8,300',
    tiktok: '@marcusj23',
    tiktokFollowers: '25,400',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-8 w-full bg-white min-h-full">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-6xl mb-2 tracking-wide leading-snug font-bebas text-nilink-ink">
              PROFILE EDITOR
            </h1>
            <p className="text-gray-600">Build your professional NIL presence</p>
          </div>
          <Link
            href="/dashboard/profile/view"
            className="flex items-center gap-2 px-6 py-3 bg-white border border-nilink-accent rounded-lg font-bold hover:bg-nilink-accent hover:text-white transition-all"
          >
            <Eye className="w-5 h-5" />
            VIEW PUBLIC PROFILE
          </Link>
        </div>
      </div>

      {/* Profile Photo */}
      <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl mb-4 tracking-wide text-gray-900" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PROFILE PHOTO</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-nilink-accent flex items-center justify-center text-white text-3xl font-bold">MJ</div>
          <button type="button" className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-nilink-accent text-white hover:bg-nilink-accent-hover transition-colors">
            <Upload className="w-4 h-4" />
            UPLOAD PHOTO
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl mb-6 tracking-wide text-gray-900" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>BASIC INFORMATION</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-600">Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-600">Sport</label>
            <select name="sport" value={formData.sport} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900">
              <option>Basketball</option><option>Football</option><option>Baseball</option><option>Soccer</option><option>Volleyball</option><option>Track &amp; Field</option><option>Swimming</option><option>Tennis</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-600">Position</label>
            <input type="text" name="position" value={formData.position} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-600">School</label>
            <input type="text" name="school" value={formData.school} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-600">Year</label>
            <select name="year" value={formData.year} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900">
              <option>Freshman</option><option>Sophomore</option><option>Junior</option><option>Senior</option><option>Graduate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl mb-6 tracking-wide text-gray-900" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>BIO</h2>
        <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors resize-none text-gray-900" placeholder="Tell businesses about yourself..." />
      </div>

      {/* Achievements */}
      <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl mb-6 tracking-wide text-gray-900" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>ACHIEVEMENTS</h2>
        <textarea name="achievements" value={formData.achievements} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors resize-none text-gray-900" placeholder="List your athletic achievements..." />
      </div>

      {/* Social Media */}
      <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl mb-6 tracking-wide text-gray-900" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SOCIAL MEDIA</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-600"><Instagram className="w-4 h-4" />Instagram Handle</label>
              <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-600"><TrendingUp className="w-4 h-4" />Followers</label>
              <input type="text" name="instagramFollowers" value={formData.instagramFollowers} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-600"><Twitter className="w-4 h-4" />Twitter Handle</label>
              <input type="text" name="twitter" value={formData.twitter} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-600"><TrendingUp className="w-4 h-4" />Followers</label>
              <input type="text" name="twitterFollowers" value={formData.twitterFollowers} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-600">TikTok Handle</label>
              <input type="text" name="tiktok" value={formData.tiktok} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-600"><TrendingUp className="w-4 h-4" />Followers</label>
              <input type="text" name="tiktokFollowers" value={formData.tiktokFollowers} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nilink-accent transition-colors text-gray-900" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" className="flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-lg bg-nilink-accent text-white hover:bg-nilink-accent-hover transition-colors">
          <Save className="w-5 h-5" />
          SAVE PROFILE
        </button>
      </div>
    </div>
  );
}
