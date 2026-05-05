'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, Instagram, X, Twitter, Heart, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useDashboard } from '../DashboardShell';
import { Athlete, Brand } from '@/lib/mockData';
import { useMarketplaceCatalog } from '@/hooks/useMarketplaceCatalog';
import { useSavedMarketplace } from '@/hooks/useSavedMarketplace';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { AthleteExploreMarketplace } from '@/components/dashboard/screens/AthleteExploreMarketplace';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';

// Custom icons for sports and tiktok
const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68a6.34 6.34 0 0 0 6.27 6.36 6.34 6.34 0 0 0 6.27-6.36v-6.9a8.16 8.16 0 0 0 5.46 2.05V7.38a4.77 4.77 0 0 1-3.41-1.12Z" />
  </svg>
);

const sports = ['Football', 'Baseball', 'Softball', 'Cheerleading', 'Dance', 'Basketball', 'Beach Volleyball'];

type MarketplaceItem = Athlete | Brand;
type MarketplaceCategory = { id: string; title: string; items: MarketplaceItem[] };

type BusinessExploreTab = 'athletes' | 'saved';

function isBrandItem(item: MarketplaceItem): item is Brand {
  return 'industry' in item;
}

const exploreFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/30 focus-visible:ring-offset-2';

export function AthleteDiscovery() {
  const { accountType } = useDashboard();
  const isAthleteView = accountType === 'athlete';
  const { brands, athletes, loading, error } = useMarketplaceCatalog();
  const {
    toggleAthlete,
    toggleBrand,
    isAthleteSaved,
    isBrandSaved,
    savedAthleteIds,
  } = useSavedMarketplace();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [businessExploreTab, setBusinessExploreTab] = useState<BusinessExploreTab>('athletes');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const athleteCategories = useMemo<MarketplaceCategory[]>(
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

  const brandCategories = useMemo<MarketplaceCategory[]>(
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

  const categories: MarketplaceCategory[] = isAthleteView ? brandCategories : athleteCategories;

  const handleItemClick = (item: MarketplaceItem, categoryId: string) => {
    setExpandedCategory(categoryId);
    if (isAthleteView && isBrandItem(item)) {
      setSelectedBrand(item);
      return;
    }
    if (!isAthleteView && !isBrandItem(item)) {
      setSelectedAthlete(item);
    }
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

  const savedAthletesFiltered = useMemo<Athlete[]>(() => {
    if (isAthleteView || businessExploreTab !== 'saved') return [];

    const q = searchQuery.toLowerCase();
    return athletes.filter((a) => {
      if (!isAthleteSaved(a.id)) return false;
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.school.toLowerCase().includes(q) ||
        a.sport.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [athletes, businessExploreTab, isAthleteSaved, isAthleteView, searchQuery]);

  const currentAthleteList = useMemo<Athlete[]>(() => {
    if (isAthleteView) return [];

    if (!isAthleteView && businessExploreTab === 'saved') {
      return savedAthletesFiltered;
    }

    if (isFiltering) {
      return filteredItems.filter((item): item is Athlete => !isBrandItem(item));
    }

    if (expandedCategory) {
      const category = athleteCategories.find((cat) => cat.id === expandedCategory);
      if (!category) return [];
      return category.items.filter((item): item is Athlete => !isBrandItem(item));
    }

    return athletes;
  }, [
    athleteCategories,
    athletes,
    businessExploreTab,
    expandedCategory,
    filteredItems,
    isAthleteView,
    isFiltering,
    savedAthletesFiltered,
  ]);

  const handleNextAthlete = () => {
    if (!selectedAthlete || currentAthleteList.length === 0) return;

    const currentIndex = currentAthleteList.findIndex((athlete) => athlete.id === selectedAthlete.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % currentAthleteList.length : 0;
    setSelectedAthlete(currentAthleteList[nextIndex]);
  };

  const displayCategory = isFiltering ? 'search' : expandedCategory;
  const hasSelection = isAthleteView ? !!selectedBrand : !!selectedAthlete;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (isAthleteView) {
    return <AthleteExploreMarketplace />;
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
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[min(100%,560px)] sm:pr-2">
            {businessExploreTab === 'athletes' ? (
              <>
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search athletes..."
                    className="h-10 w-full rounded-full border border-gray-200 bg-white px-9 text-sm text-gray-900 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-gray-400 hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
                  />
                </label>
                <button
                  type="button"
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm transition-colors duration-200 ease-out hover:bg-gray-50 ${exploreFocusRing}`}
                  onClick={() => setShowAdvancedFilters((v) => !v)}
                  aria-expanded={showAdvancedFilters}
                  aria-controls="explore-advanced-filters"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                  Filters
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              </>
            ) : (
              <label className="relative w-full min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved athletes..."
                  className="h-10 w-full rounded-full border border-gray-200 bg-white px-9 text-sm text-gray-900 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-gray-400 hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
                />
              </label>
            )}
          </div>
          <div
            className="flex shrink-0 items-center justify-start gap-1 self-stretch rounded-full border border-gray-200 bg-gray-100 p-1 sm:justify-end sm:self-center"
            role="tablist"
            aria-label="Explore sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={businessExploreTab === 'athletes'}
              onClick={() => {
                setBusinessExploreTab('athletes');
                setShowAdvancedFilters(false);
              }}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-out ${exploreFocusRing} ${
                businessExploreTab === 'athletes'
                  ? 'bg-nilink-accent text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              Athletes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={businessExploreTab === 'saved'}
              onClick={() => {
                setBusinessExploreTab('saved');
                setExpandedCategory(null);
                setShowAdvancedFilters(false);
              }}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-out ${exploreFocusRing} ${
                businessExploreTab === 'saved'
                  ? 'bg-nilink-accent text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              Saved
            </button>
          </div>
        </div>
        {businessExploreTab === 'athletes' && showAdvancedFilters ? (
          <div
            id="explore-advanced-filters"
            className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3"
          >
            <select
              value={activeSport ?? ''}
              onChange={(e) => setActiveSport(e.target.value || null)}
              className="w-[140px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
            >
              <option value="">Sport</option>
              {sports.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs font-semibold text-nilink-accent transition-colors duration-200 ease-out hover:bg-nilink-accent/5 hover:underline ${exploreFocusRing}`}
              onClick={() => setActiveSport(null)}
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Main Grid Area */}
        <div className={`min-w-0 flex-1 overflow-y-auto py-6 scrollbar-hide dash-main-gutter-x ${hasSelection ? 'max-w-[50%]' : ''}`}>
          {loading && (
            <div className="mb-4 text-xs text-gray-400">Loading marketplace…</div>
          )}

          {businessExploreTab === 'saved' ? (
            savedAthleteIds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200/90 bg-gray-50/80 px-5 py-12 text-center sm:py-14">
                <p className="text-sm font-medium text-gray-900">No saved athletes</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                  Save athletes while browsing to find them faster next time.
                </p>
              </div>
            ) : savedAthletesFiltered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200/90 bg-gray-50/80 px-5 py-12 text-center sm:py-14">
                <p className="text-sm font-medium text-gray-900">No saved athletes match your search</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                  Try another keyword to filter your saved list.
                </p>
              </div>
            ) : (
              <section className="pb-8">
                <div className="mb-6 flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold tracking-tight text-gray-900">Saved athletes</h2>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                      Bookmarked NIL talent you want to revisit.
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {savedAthletesFiltered.length} saved
                  </span>
                </div>
                <div className={`grid gap-4 ${hasSelection ? 'grid-cols-2' : 'grid-cols-4'}`}>
                  {savedAthletesFiltered.map((item, i) => (
                    <div
                      key={`${item.id}_saved_${i}`}
                      onClick={() => setSelectedAthlete(item)}
                      className="group cursor-pointer"
                    >
                      <div
                        className={`relative ${hasSelection ? 'aspect-[4/3]' : 'aspect-square md:aspect-[4/3]'} mb-3 overflow-hidden rounded-xl`}
                      >
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                        <button
                          type="button"
                          title={isAthleteSaved(item.id) ? 'Remove from saved' : 'Save athlete'}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAthlete(item.id);
                          }}
                          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors ${
                            isAthleteSaved(item.id)
                              ? 'bg-nilink-accent text-white'
                              : 'bg-white/95 text-gray-600 hover:bg-white'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isAthleteSaved(item.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="mb-1 flex items-center gap-1">
                        <span className="font-bold text-gray-900 transition-colors group-hover:text-nilink-accent">
                          {item.name}
                        </span>
                        {item.verified ? <VerifiedBadge /> : null}
                      </div>
                      <p className="mb-2 truncate text-xs text-gray-500">
                        {item.sport} | {item.school}
                      </p>
                      <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                        <span className="flex items-center gap-1">
                          <Instagram className="h-3.5 w-3.5 text-pink-600" /> {item.stats.instagram}
                        </span>
                        <span className="flex items-center gap-1">
                          <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> {item.stats.tiktok}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          ) : displayCategory ? (() => {
            const activeCat: MarketplaceCategory | undefined = isFiltering
              ? { id: 'search', title: 'Results', items: filteredItems }
              : categories.find((c) => c.id === displayCategory);
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
                  {activeCat.items.map((item, i: number) => (
                    <div 
                      key={`${item.id}_expanded_${i}`} 
                      onClick={() => handleItemClick(item, activeCat.id)}
                      className="group cursor-pointer"
                    >
                      <div className={`relative ${hasSelection ? 'aspect-[4/3]' : 'aspect-square md:aspect-[4/3]'} rounded-xl overflow-hidden mb-3 ${isAthleteView ? 'bg-gray-100 border border-gray-100' : ''}`}>
                        <ImageWithFallback
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
                        {isBrandItem(item)
                          ? `${item.industry} | ${item.location}`
                          : `${item.sport} | ${item.school}`}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Instagram className="h-3.5 w-3.5 text-pink-600" /> {item.stats.instagram}
                        </span>
                        <span className="flex items-center gap-1">
                          <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> {item.stats.tiktok}
                        </span>
                        {isBrandItem(item) ? (
                          <span className="flex items-center gap-1">
                            <Twitter className="h-3.5 w-3.5 text-sky-500" /> {item.stats.twitter}
                          </span>
                        ) : null}
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
                      className="rounded-md bg-nilink-ink px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-800"
                    >
                      See all
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    {cat.items.slice(0, 4).map((item, i: number) => (
                      <div 
                        key={`${item.id}_${cat.id}_${i}`} 
                        onClick={() => handleItemClick(item, cat.id)}
                        className="group cursor-pointer"
                      >
                        <div className={`relative aspect-[4/3] rounded-xl overflow-hidden mb-3 ${isAthleteView ? 'bg-gray-100 border border-gray-100' : ''}`}>
                          <ImageWithFallback
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
                          {isBrandItem(item)
                            ? `${item.industry} | ${item.location}`
                            : `${item.sport} | ${item.school}`}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Instagram className="h-3.5 w-3.5 text-pink-600" /> {item.stats.instagram}
                          </span>
                          <span className="flex items-center gap-1">
                            <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> {item.stats.tiktok}
                          </span>
                          {isBrandItem(item) ? (
                            <span className="flex items-center gap-1">
                              <Twitter className="h-3.5 w-3.5 text-sky-500" /> {item.stats.twitter}
                            </span>
                          ) : null}
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
                      <ImageWithFallback
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
                    type="button"
                    onClick={() => setSelectedAthlete(null)}
                    className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 transition-colors hover:bg-black/40"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                  {/* Profile Header */}
                  <div className="border-b border-gray-100 px-6 pb-6 pt-6">
                    <div className="flex items-center gap-5">
                      <ImageWithFallback
                        src={selectedAthlete.image}
                        alt={selectedAthlete.name}
                        className="h-56 w-56 shrink-0 rounded-full border-4 border-white bg-white object-cover shadow-sm"
                      />
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <h2 className="text-3xl font-bold leading-tight">{selectedAthlete.name}</h2>
                          {selectedAthlete.verified && <VerifiedBadge className="h-6 w-6 shrink-0" />}
                        </div>
                        <p className="mb-3 text-sm text-gray-500">
                          {selectedAthlete.sport} | {selectedAthlete.school}
                        </p>
                        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                          <span className="flex items-center gap-1">
                            <Instagram className="h-4 w-4 text-pink-600" /> {selectedAthlete.stats.instagram}
                          </span>
                          <span className="flex items-center gap-1">
                            <TiktokIcon className="h-4 w-4 text-nilink-ink" /> {selectedAthlete.stats.tiktok}
                          </span>
                        </div>
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
                          <ImageWithFallback src={img} className="w-full h-full object-cover" alt="Content" />
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
            <div className="flex shrink-0 justify-center gap-3 border-t border-gray-100 bg-white p-4">
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
                onClick={handleNextAthlete}
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
