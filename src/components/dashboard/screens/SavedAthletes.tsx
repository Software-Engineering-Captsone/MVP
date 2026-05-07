'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, Filter, Instagram, X, Twitter } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useDashboard } from '../DashboardShell';
import { Athlete, Brand } from '@/lib/mockData';
import { useMarketplaceCatalog } from '@/hooks/useMarketplaceCatalog';
import { useSavedMarketplace } from '@/hooks/useSavedMarketplace';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

// Custom icons for sports and tiktok
const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68a6.34 6.34 0 0 0 6.27 6.36 6.34 6.34 0 0 0 6.27-6.36v-6.9a8.16 8.16 0 0 0 5.46 2.05V7.38a4.77 4.77 0 0 1-3.41-1.12Z" />
  </svg>
);

const FootballIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="7" transform="rotate(-45 12 12)" />
    <path d="M8 8l8 8" />
    <path d="M11 9l2 2" />
    <path d="M9 11l2 2" />
    <path d="M13 11l2 2" />
  </svg>
);

const BaseballIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2A10 10 0 0 1 12 22" />
    <path d="M12 2A10 10 0 0 0 12 22" />
    <path d="M8 5a8 8 0 0 0 0 14" />
    <path d="M16 5a8 8 0 0 1 0 14" />
  </svg>
);

const sports = ['Football', 'Baseball', 'Softball', 'Cheerleading', 'Dance', 'Basketball', 'Beach Volleyball'];
const industries = ['Sports Nutrition', 'Apparel', 'Fitness Tech', 'Beverages', 'Footwear', 'Fitness Equipment'];

export function SavedAthletes() {
  const { accountType } = useDashboard();
  const isAthleteView = accountType === 'athlete';
  const { brands, athletes, loading, error } = useMarketplaceCatalog();
  const { savedAthleteIds, savedBrandIds, removeAthlete, removeBrand, hydrated } = useSavedMarketplace();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const savedAthleteSet = new Set(savedAthleteIds);
  const savedBrandSet = new Set(savedBrandIds);

  const filteredAthletes = athletes.filter(a => {
    if (!savedAthleteSet.has(a.id)) return false;
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.school.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = activeSport ? a.sport === activeSport : true;
    return matchesSearch && matchesSport;
  });

  const filteredBrands = brands.filter(b => {
    if (!savedBrandSet.has(b.id)) return false;
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = activeIndustry ? b.industry === activeIndustry : true;
    return matchesSearch && matchesIndustry;
  });

  const activeFilter = isAthleteView ? activeIndustry : activeSport;
  const setActiveFilter = isAthleteView ? setActiveIndustry : setActiveSport;
  const filterOptions = isAthleteView ? industries : sports;
  
  const hasSelection = isAthleteView ? !!selectedBrand : !!selectedAthlete;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-3 pt-5">
        <DashboardPageHeader
          title="Saved"
          subtitle={
            isAthleteView
              ? 'Brands you follow and want to remember'
              : 'Athletes and brands you follow'
          }
        />
      </div>
      {/* Top Filter Bar */}
      <div className="dash-main-gutter-x flex shrink-0 items-center gap-3 border-b border-gray-100 py-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAthleteView ? "Search Brands..." : "Search Athletes..."}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
        
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          All Filters
        </button>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 pb-1">
          {filterOptions.map(option => {
            const isActive = activeFilter === option;
            return (
              <button
                key={option}
                onClick={() => setActiveFilter(isActive ? null : option)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-gray-800 bg-gray-100 text-gray-900'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option === 'Football' && <FootballIcon className="w-4 h-4" />}
                {(option === 'Baseball' || option === 'Softball') && <BaseballIcon className="w-4 h-4" />}
                {option !== 'Football' && option !== 'Baseball' && option !== 'Softball' && (
                  <div className="w-4 h-4 rounded-full border border-current opacity-50 flex items-center justify-center text-[8px]">✦</div>
                )}
                {option}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Main Grid Area */}
        <div className={`min-w-0 flex-1 overflow-y-auto py-6 scrollbar-hide dash-main-gutter-x ${hasSelection ? 'max-w-[50%]' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{isAthleteView ? 'Saved Brands' : 'Saved Athletes'}</h2>
            {loading && <span className="text-xs text-gray-400">Loading…</span>}
          </div>

          <div className={`grid gap-4 pb-8 ${hasSelection ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {hydrated && (isAthleteView ? savedBrandIds.length === 0 : savedAthleteIds.length === 0) ? (
              <div className="col-span-full rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-16 text-center">
                <p className="text-sm font-medium text-gray-900">Nothing saved yet</p>
                <p className="mt-2 text-sm text-gray-500">
                  {isAthleteView
                    ? 'Use Explore to open a brand and tap Save Brand.'
                    : 'Use Explore or an athlete profile to save athletes you want to revisit.'}
                </p>
              </div>
            ) : null}
            {hydrated &&
            (isAthleteView ? savedBrandIds.length > 0 : savedAthleteIds.length > 0) &&
            (isAthleteView ? filteredBrands.length === 0 : filteredAthletes.length === 0) ? (
              <div className="col-span-full rounded-xl border border-gray-100 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">
                No saved {isAthleteView ? 'brands' : 'athletes'} match your search or filters.
              </div>
            ) : null}
            {isAthleteView ? (
              filteredBrands.map(brand => (
                <div 
                  key={brand.id} 
                  onClick={() => setSelectedBrand(brand)}
                  className="group cursor-pointer"
                >
                  <div className={`relative ${hasSelection ? 'aspect-[4/3]' : 'aspect-square md:aspect-[4/3]'} rounded-xl overflow-hidden mb-3 bg-gray-100 border border-gray-100`}>
                    <img src={brand.image} alt={brand.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <h3 className="font-bold text-gray-900">{brand.name}</h3>
                    {brand.verified && <VerifiedBadge />}
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">
                    {brand.industry} | {brand.location}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Instagram className="h-3.5 w-3.5 text-pink-600" /> {brand.stats.instagram}
                    </span>
                    <span className="flex items-center gap-1">
                      <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> {brand.stats.tiktok}
                    </span>
                    <span className="flex items-center gap-1">
                      <Twitter className="h-3.5 w-3.5 text-sky-500" /> {brand.stats.twitter}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              filteredAthletes.map(athlete => (
                <div 
                  key={athlete.id} 
                  onClick={() => setSelectedAthlete(athlete)}
                  className="group cursor-pointer"
                >
                  <div className={`relative ${hasSelection ? 'aspect-[4/3]' : 'aspect-square md:aspect-[4/3]'} rounded-xl overflow-hidden mb-3`}>
                    <img src={athlete.image} alt={athlete.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <h3 className="font-bold text-gray-900">{athlete.name}</h3>
                    {athlete.verified && <VerifiedBadge />}
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">
                    {athlete.sport} | {athlete.school}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Instagram className="h-3.5 w-3.5 text-pink-600" /> {athlete.stats.instagram}
                    </span>
                    <span className="flex items-center gap-1">
                      <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> {athlete.stats.tiktok}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick View Sidebar (Right) */}
        {hasSelection && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-gray-100 bg-gray-50/30">
            {isAthleteView && selectedBrand ? (
              // BRAND SIDEBAR
              <div className="flex-1 overflow-y-auto py-6 scrollbar-hide dash-detail-pane-x">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm relative">
                  <button 
                    onClick={() => setSelectedBrand(null)}
                    className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  {/* Banner */}
                  <div className="relative h-32 bg-nilink-ink">
                  </div>
                  
                  {/* Profile Header */}
                  <div className="px-6 relative pb-6 border-b border-gray-100">
                    <div className="absolute -top-12 left-6">
                      <img 
                        src={selectedBrand.image} 
                        alt={selectedBrand.name} 
                        className="w-24 h-24 rounded-2xl border-4 border-white object-cover shadow-sm bg-white" 
                      />
                    </div>
                    <div className="ml-28 pt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold">{selectedBrand.name}</h2>
                        {selectedBrand.verified && <VerifiedBadge className="w-5 h-5 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {selectedBrand.industry} | {selectedBrand.location}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Instagram className="h-3.5 w-3.5 text-pink-600" /> {selectedBrand.stats.instagram}
                        </span>
                        <span className="flex items-center gap-1">
                          <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> {selectedBrand.stats.tiktok}
                        </span>
                        <span className="flex items-center gap-1">
                          <Twitter className="h-3.5 w-3.5 text-sky-500" /> {selectedBrand.stats.twitter}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Overview */}
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-2">Overview</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-6">
                      {selectedBrand.bio || "No bio available."}
                    </p>
                  </div>
                </div>
              </div>
            ) : selectedAthlete ? (
              // ATHLETE SIDEBAR
              <div className="flex-1 overflow-y-auto py-6 scrollbar-hide dash-detail-pane-x">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm relative">
                  <button 
                    onClick={() => setSelectedAthlete(null)}
                    className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  {/* Banner */}
                  <div className="h-32 bg-[#FFCD00] relative">
                    {selectedAthlete.teamLogo && (
                      <img src={selectedAthlete.teamLogo} alt="Team Logo" className="absolute right-4 top-4 h-16 opacity-80" />
                    )}
                  </div>
                  
                  {/* Profile Header */}
                  <div className="px-6 relative pb-6 border-b border-gray-100">
                    <div className="absolute -top-12 left-6">
                      <img 
                        src={selectedAthlete.image} 
                        alt={selectedAthlete.name} 
                        className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-sm bg-white" 
                      />
                    </div>
                    <div className="ml-28 pt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold">{selectedAthlete.name}</h2>
                        {selectedAthlete.verified && <VerifiedBadge className="w-5 h-5 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {selectedAthlete.sport} | {selectedAthlete.school}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Instagram className="h-3.5 w-3.5 text-pink-600" /> {selectedAthlete.stats.instagram}
                        </span>
                        <span className="flex items-center gap-1">
                          <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> {selectedAthlete.stats.tiktok}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Overview */}
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-2">Overview</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-6">
                      {selectedAthlete.bio || "No bio available."}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg">Content</h3>
                      <div className="flex gap-1">
                        <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {selectedAthlete.contentImages?.map((img, i) => (
                        <div key={i} className="aspect-[3/4] rounded-lg overflow-hidden relative">
                          <img src={img} className="w-full h-full object-cover" alt="Content" />
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white font-medium bg-black/40 px-1.5 py-0.5 rounded">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            33K
                          </div>
                        </div>
                      ))}
                      {(!selectedAthlete.contentImages || selectedAthlete.contentImages.length === 0) && (
                        <div className="col-span-3 h-32 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          No recent content
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Sticky Actions Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isAthleteView && selectedBrand) {
                    removeBrand(selectedBrand.id);
                    setSelectedBrand(null);
                  } else if (!isAthleteView && selectedAthlete) {
                    removeAthlete(selectedAthlete.id);
                    setSelectedAthlete(null);
                  }
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Remove from Saved
              </button>
              {!isAthleteView && selectedAthlete ? (
                <Link
                  href={`/dashboard/profile/view?id=${selectedAthlete.id}`}
                  className="inline-flex items-center justify-center rounded-lg bg-nilink-accent px-4 py-2 text-sm font-semibold !text-white no-underline transition-colors hover:bg-nilink-accent-hover hover:!text-white"
                >
                  View Profile
                </Link>
              ) : (
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
