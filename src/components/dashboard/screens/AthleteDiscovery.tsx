'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, Instagram, Facebook, X, Twitter, Heart } from 'lucide-react';
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

export function AthleteDiscovery() {
  const { accountType } = useDashboard();
  const isAthleteView = accountType === 'athlete';
  const { brands, athletes, loading, error } = useMarketplaceCatalog();
  const { toggleAthlete, toggleBrand, isAthleteSaved, isBrandSaved } = useSavedMarketplace();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const athleteCategories = useMemo(
    () => [
      { id: 'popular', title: 'Popular Athletes', items: athletes },
      { id: 'aligned', title: 'Aligned Athletes', items: [...athletes].reverse() },
      {
        id: 'near_you',
        title: 'Athletes Near You',
        items: [...athletes].sort((a, b) => a.school.localeCompare(b.school)),
      },
    ],
    [athletes]
  );

  const brandCategories = useMemo(
    () => [
      { id: 'popular', title: 'Popular Brands', items: brands },
      { id: 'aligned', title: 'Aligned Brands', items: [...brands].reverse() },
      {
        id: 'near_you',
        title: 'Brands Near You',
        items: [...brands].sort((a, b) => a.location.localeCompare(b.location)),
      },
    ],
    [brands]
  );

  const categories = isAthleteView ? brandCategories : athleteCategories;

  const handleItemClick = (item: any, categoryId: string) => {
    setExpandedCategory(categoryId);
    if (isAthleteView) setSelectedBrand(item);
    else setSelectedAthlete(item);
  };

  const handleBackToExplore = () => {
    setExpandedCategory(null);
    setSelectedAthlete(null);
    setSelectedBrand(null);
    setSearchQuery('');
    setActiveSport(null);
    setActiveIndustry(null);
  };

  const isFiltering = searchQuery.trim() !== '' || (isAthleteView ? activeIndustry !== null : activeSport !== null);
  
  const filteredItems = isAthleteView 
    ? brands.filter(b => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          b.name.toLowerCase().includes(q) ||
          b.industry.toLowerCase().includes(q) ||
          b.location.toLowerCase().includes(q);
        const matchesIndustry = activeIndustry ? b.industry === activeIndustry : true;
        return matchesSearch && matchesIndustry;
      })
    : athletes.filter(a => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          a.name.toLowerCase().includes(q) ||
          a.school.toLowerCase().includes(q) ||
          a.sport.toLowerCase().includes(q);
        const matchesSport = activeSport ? a.sport === activeSport : true;
        return matchesSearch && matchesSport;
      });

  const displayCategory = isFiltering ? 'search' : expandedCategory;
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
          title="Explore"
          subtitle={
            isAthleteView
              ? 'Discover brands to partner with'
              : 'Discover athletes for your campaigns'
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
            placeholder={isAthleteView ? 'Search brands…' : 'Search athletes…'}
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
          {filterOptions.map((option) => {
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
                {!isAthleteView && option === 'Football' && <FootballIcon className="w-4 h-4" />}
                {!isAthleteView && (option === 'Baseball' || option === 'Softball') && <BaseballIcon className="w-4 h-4" />}
                {(isAthleteView || (option !== 'Football' && option !== 'Baseball' && option !== 'Softball')) && (
                  <div className="w-4 h-4 rounded-full border border-current opacity-50 flex items-center justify-center text-[8px]">✦</div>
                )}
                {option}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Grid Area */}
        <div className={`flex-1 overflow-y-auto py-6 scrollbar-hide dash-main-gutter-x ${hasSelection ? 'max-w-[50%]' : ''}`}>
          {loading && (
            <div className="mb-4 text-xs text-gray-400">Loading marketplace…</div>
          )}
          
          {displayCategory ? (() => {
            const activeCat = isFiltering 
              ? { id: 'search', title: 'Results', items: filteredItems }
              : categories.find((c: any) => c.id === displayCategory);
            if (!activeCat) return null;
            
            return (
              <>
                <div className="mb-4 text-sm text-gray-400">
                  <span className="hover:text-gray-600 cursor-pointer" onClick={handleBackToExplore}>
                    {isFiltering ? 'Clear filters' : 'Explore'}
                  </span>
                  {!isFiltering && ` / ${activeCat.title}`}
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-xl font-bold">{activeCat.title}</h2>
                    <span className="text-sm font-medium text-gray-500">{activeCat.items.length} Results</span>
                  </div>
                </div>

                <div className={`grid gap-4 ${hasSelection ? 'grid-cols-2' : 'grid-cols-4'}`}>
                  {activeCat.items.map((item: any, i: number) => (
                    <div 
                      key={`${item.id}_expanded_${i}`} 
                      onClick={() => handleItemClick(item, activeCat.id)}
                      className="group cursor-pointer"
                    >
                      <div className={`relative ${hasSelection ? 'aspect-[4/3]' : 'aspect-square md:aspect-[4/3]'} rounded-xl overflow-hidden mb-3 ${isAthleteView ? 'bg-gray-100 border border-gray-100' : ''}`}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                        <button
                          type="button"
                          title={isAthleteView ? (isBrandSaved(item.id) ? 'Remove from saved' : 'Save brand') : (isAthleteSaved(item.id) ? 'Remove from saved' : 'Save athlete')}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAthleteView) toggleBrand(item.id);
                            else toggleAthlete(item.id);
                          }}
                          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors ${
                            (isAthleteView ? isBrandSaved(item.id) : isAthleteSaved(item.id))
                              ? 'bg-nilink-accent text-white'
                              : 'bg-white/95 text-gray-600 hover:bg-white'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${(isAthleteView ? isBrandSaved(item.id) : isAthleteSaved(item.id)) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-bold text-gray-900 group-hover:text-nilink-accent transition-colors">{item.name}</span>
                        {item.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2 truncate">
                        {isAthleteView ? `${item.industry} | ${item.location}` : `${item.sport} | ${item.school}`}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> {item.stats.instagram}</span>
                        <span className="flex items-center gap-1"><TiktokIcon className="w-3.5 h-3.5" /> {item.stats.tiktok}</span>
                        <span className="flex items-center gap-1">
                          {isAthleteView ? <Twitter className="w-3.5 h-3.5" /> : <Facebook className="w-3.5 h-3.5" />} {isAthleteView ? item.stats.twitter : item.stats.facebook}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 pb-8 text-center">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Load More
                  </button>
                </div>
              </>
            );
          })() : (
            // Default View - All Categories
            <div className="space-y-10 pb-10">
              {categories.map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{cat.title}</h2>
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(cat.id)}
                      className="rounded-lg bg-nilink-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-nilink-accent-hover"
                    >
                      See All
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    {cat.items.slice(0, 4).map((item: any, i: number) => (
                      <div 
                        key={`${item.id}_${cat.id}_${i}`} 
                        onClick={() => handleItemClick(item, cat.id)}
                        className="group cursor-pointer"
                      >
                        <div className={`relative aspect-[4/3] rounded-xl overflow-hidden mb-3 ${isAthleteView ? 'bg-gray-100 border border-gray-100' : ''}`}>
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          />
                          <button
                            type="button"
                            title={isAthleteView ? (isBrandSaved(item.id) ? 'Remove from saved' : 'Save brand') : (isAthleteSaved(item.id) ? 'Remove from saved' : 'Save athlete')}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAthleteView) toggleBrand(item.id);
                              else toggleAthlete(item.id);
                            }}
                            className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors ${
                              (isAthleteView ? isBrandSaved(item.id) : isAthleteSaved(item.id))
                                ? 'bg-nilink-accent text-white'
                                : 'bg-white/95 text-gray-600 hover:bg-white'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${(isAthleteView ? isBrandSaved(item.id) : isAthleteSaved(item.id)) ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="font-bold text-gray-900 group-hover:text-nilink-accent transition-colors">{item.name}</span>
                          {item.verified && <VerifiedBadge />}
                        </div>
                        <p className="text-xs text-gray-500 mb-2 truncate">
                          {isAthleteView ? `${item.industry} | ${item.location}` : `${item.sport} | ${item.school}`}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                          <span className="flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> {item.stats.instagram}</span>
                          <span className="flex items-center gap-1"><TiktokIcon className="w-3.5 h-3.5" /> {item.stats.tiktok}</span>
                          <span className="flex items-center gap-1">
                            {isAthleteView ? <Twitter className="w-3.5 h-3.5" /> : <Facebook className="w-3.5 h-3.5" />} {isAthleteView ? item.stats.twitter : item.stats.facebook}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick View Sidebar (Right) */}
        {hasSelection && (
          <div className="flex-1 border-l border-gray-100 flex flex-col bg-gray-50/30 overflow-hidden">
            {isAthleteView && selectedBrand ? (
              // BRAND SIDEBAR
              <div className="flex-1 overflow-y-auto py-6 scrollbar-hide dash-main-gutter-x">
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
                        <span className="flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> {selectedBrand.stats.instagram}</span>
                        <span className="flex items-center gap-1"><TiktokIcon className="w-3.5 h-3.5" /> {selectedBrand.stats.tiktok}</span>
                        <span className="flex items-center gap-1"><Twitter className="w-3.5 h-3.5" /> {selectedBrand.stats.twitter}</span>
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
              <div className="flex-1 overflow-y-auto py-6 scrollbar-hide dash-main-gutter-x">
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
                        <span className="flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> {selectedAthlete.stats.instagram}</span>
                        <span className="flex items-center gap-1"><TiktokIcon className="w-3.5 h-3.5" /> {selectedAthlete.stats.tiktok}</span>
                        <span className="flex items-center gap-1"><Facebook className="w-3.5 h-3.5" /> {selectedAthlete.stats.facebook}</span>
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
              {isAthleteView && selectedBrand ? (
                <button
                  type="button"
                  onClick={() => toggleBrand(selectedBrand.id)}
                  title={isBrandSaved(selectedBrand.id) ? 'Remove from saved' : 'Save brand'}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isBrandSaved(selectedBrand.id)
                      ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isBrandSaved(selectedBrand.id) ? 'fill-current' : ''}`} />
                  {isBrandSaved(selectedBrand.id) ? 'Saved' : 'Save Brand'}
                </button>
              ) : selectedAthlete ? (
                <button
                  type="button"
                  onClick={() => toggleAthlete(selectedAthlete.id)}
                  title={isAthleteSaved(selectedAthlete.id) ? 'Remove from saved' : 'Save athlete'}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isAthleteSaved(selectedAthlete.id)
                      ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isAthleteSaved(selectedAthlete.id) ? 'fill-current' : ''}`} />
                  {isAthleteSaved(selectedAthlete.id) ? 'Saved' : 'Save Athlete'}
                </button>
              ) : null}
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
              <button
                type="button"
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Next {isAthleteView ? 'Brand' : 'Athlete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
