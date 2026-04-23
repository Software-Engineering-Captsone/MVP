'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useVirtualizer, measureElement } from '@tanstack/react-virtual';
import { ChevronDown, Loader2, MapPin, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import {
  OpportunityExploreCard,
  OpportunityExploreCardPlaceholder,
  toOpportunityChips,
} from '@/components/dashboard/cards/OpportunityExploreCard';
import { brandDirectoryCardTokens } from '@/components/dashboard/cards/opportunityCardTokens';
import { authFetch } from '@/lib/authFetch';
import { useMarketplaceCatalog } from '@/hooks/useMarketplaceCatalog';
import type { ApiCampaignRow } from '@/lib/campaigns/clientMap';
import type { Brand } from '@/lib/mockData';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';

type ExploreTab = 'opportunities' | 'brands' | 'saved';
type BrandProfileTab = 'overview' | 'campaigns';

type ApplicationWithCampaign = {
  application: {
    id: string;
    campaignId: string;
    status: string;
    pitch?: string;
    withdrawnByAthlete?: boolean;
    createdAt?: string;
  };
  campaign: {
    id: string;
    name: string;
    image?: string;
    brandUserId?: string;
    brandDisplayName?: string;
  } | null;
};

const PLACEHOLDER_IMAGE = '/brands_images/brand-01.svg';

/** Marketplace filter dropdowns — align with campaign `sport` / `sportCategory` values. */
const OPPORTUNITY_FILTER_SPORTS = [
  'Basketball',
  'Football',
  'Baseball',
  'Soccer',
  'Track & Field',
  'Volleyball',
  'Gymnastics',
] as const;

/** `category` query is substring match against goal/package/objective signals (lowercase values). */
const OPPORTUNITY_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'product review', label: 'Product review' },
  { value: 'commercial shoot', label: 'Commercial shoot' },
  { value: 'brand ambassador', label: 'Brand ambassador' },
  { value: 'social media campaign', label: 'Social media campaign' },
  { value: 'product endorsement', label: 'Product endorsement' },
  { value: 'awareness', label: 'Awareness objective' },
  { value: 'ugc', label: 'UGC / creator content' },
];

const OPPORTUNITY_PLATFORMS = ['Instagram', 'TikTok'] as const;

function formatDate(value?: string): string {
  if (!value) return 'Recently';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatOpenUntil(value?: string): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function condensedDeliverableChips(campaign: ApiCampaignRow): string[] {
  if (Array.isArray(campaign.packageDetails) && campaign.packageDetails.length > 0) {
    return campaign.packageDetails
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  const chips: string[] = [];
  if (Array.isArray(campaign.platforms) && campaign.platforms.length > 0) {
    chips.push(...campaign.platforms.slice(0, 2).map((item) => String(item).trim()).filter(Boolean));
  }
  const campaignType = typeof campaign.campaignType === 'string' ? campaign.campaignType.trim() : '';
  if (campaignType) chips.push(campaignType);
  if (chips.length > 0) return chips.slice(0, 3);
  return ['Deliverables shared'];
}

function detailSectionTitle(text: string) {
  return <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{text}</h4>;
}

/** Phase 6: shared explore typography (presentation only). */
const exploreSectionTitle = 'text-lg font-bold tracking-tight text-gray-900';
const exploreSectionSubtitle = 'mt-1 text-sm leading-relaxed text-gray-500';
const exploreSectionMeta = 'text-xs font-semibold uppercase tracking-wider text-gray-500';
const explorePanelLabel = 'text-[11px] font-bold uppercase tracking-wider text-gray-500';
const exploreCardTitle = 'text-[15px] font-semibold leading-snug text-gray-900';
const exploreCardMeta = 'text-xs text-gray-500';
const exploreInteractiveSurface =
  'transition-[box-shadow,border-color,transform,background-color] duration-200 ease-out motion-reduce:transition-none';
const exploreFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/30 focus-visible:ring-offset-2';

function isWithdrawnApplication(app?: ApplicationWithCampaign['application'] | null): boolean {
  if (!app) return false;
  const status = String(app.status ?? '');
  return (status === 'rejected' || status === 'declined') && app.withdrawnByAthlete === true;
}

function brandBannerSrc(brand: Brand): string {
  const fromGallery = brand.contentImages?.find((url) => typeof url === 'string' && url.trim());
  if (fromGallery) return fromGallery.trim();
  const logo = typeof brand.image === 'string' ? brand.image.trim() : '';
  return logo || PLACEHOLDER_IMAGE;
}

function brandLogoSrc(brand: Brand): string {
  const logo = typeof brand.image === 'string' ? brand.image.trim() : '';
  return logo || PLACEHOLDER_IMAGE;
}

function brandTagline(brand: Brand): string {
  const raw = brand.bio?.trim();
  if (!raw) return 'NIL marketplace partner for student-athlete collaborations.';
  const firstBit = raw.match(/^[^.!?]+[.!?]?/);
  const line = (firstBit ? firstBit[0] : raw).trim();
  const cleaned = line.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 140) return cleaned;
  return `${cleaned.slice(0, 137)}…`;
}

/** Card grid: 20px gaps (gap-5) for stable rhythm; aligns with Saved / Brands surfaces */
function opportunityRowInnerGridClass(cols: number): string {
  if (cols >= 3) return 'grid grid-cols-3 gap-5';
  if (cols === 2) return 'grid grid-cols-2 gap-5';
  return 'grid grid-cols-1 gap-5';
}

export function AthleteExploreMarketplace() {
  const { brands } = useMarketplaceCatalog();
  const [activeTab, setActiveTab] = useState<ExploreTab>('opportunities');
  const [brandProfileTab, setBrandProfileTab] = useState<BrandProfileTab>('overview');
  const [search, setSearch] = useState('');

  const [opportunitySport, setOpportunitySport] = useState('');
  const [opportunityCategory, setOpportunityCategory] = useState('');
  const [opportunityPlatform, setOpportunityPlatform] = useState('');
  const [opportunityCompMin, setOpportunityCompMin] = useState('');
  const [opportunityCompMax, setOpportunityCompMax] = useState('');
  const [opportunityLocation, setOpportunityLocation] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [campaigns, setCampaigns] = useState<ApiCampaignRow[]>([]);
  const [applications, setApplications] = useState<ApplicationWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMoreCampaigns, setLoadingMoreCampaigns] = useState(false);

  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const loadSentinelRef = useRef<HTMLDivElement | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const loadMoreInFlightRef = useRef(false);

  const [opportunityGridCols, setOpportunityGridCols] = useState(1);

  const [selectedCampaign, setSelectedCampaign] = useState<ApiCampaignRow | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const [applyPitch, setApplyPitch] = useState('');
  const [applyTargetCampaignId, setApplyTargetCampaignId] = useState<string | null>(null);
  const [savedCampaignIds, setSavedCampaignIds] = useState<string[]>([]);

  const appendAthleteCampaignFilters = useCallback((sp: URLSearchParams) => {
    if (opportunitySport.trim()) sp.set('sport', opportunitySport.trim());
    if (opportunityCategory.trim()) sp.set('category', opportunityCategory.trim());
    if (opportunityPlatform.trim()) sp.set('platform', opportunityPlatform.trim());
    const cmin = opportunityCompMin.trim();
    const cmax = opportunityCompMax.trim();
    if (cmin !== '') {
      const n = Number.parseInt(cmin, 10);
      if (Number.isFinite(n) && n >= 0) sp.set('compMin', String(n));
    }
    if (cmax !== '') {
      const n = Number.parseInt(cmax, 10);
      if (Number.isFinite(n) && n >= 0) sp.set('compMax', String(n));
    }
    if (opportunityLocation.trim()) sp.set('location', opportunityLocation.trim());
  }, [
    opportunitySport,
    opportunityCategory,
    opportunityPlatform,
    opportunityCompMin,
    opportunityCompMax,
    opportunityLocation,
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    loadMoreInFlightRef.current = false;
    setNextCursor(null);
    nextCursorRef.current = null;
    try {
      const csp = new URLSearchParams();
      csp.set('limit', '20');
      appendAthleteCampaignFilters(csp);
      const [campaignsRes, appsRes] = await Promise.all([
        authFetch(`/api/campaigns?${csp.toString()}`),
        authFetch('/api/applications'),
      ]);
      const campaignsJson = (await campaignsRes.json()) as {
        campaigns?: ApiCampaignRow[];
        nextCursor?: string | null;
        error?: string;
      };
      const appsJson = (await appsRes.json()) as {
        applications?: ApplicationWithCampaign[];
        error?: string;
      };
      if (!campaignsRes.ok) {
        setError(campaignsJson.error || 'Could not load opportunities');
        setCampaigns([]);
        setNextCursor(null);
        nextCursorRef.current = null;
      } else {
        setCampaigns(Array.isArray(campaignsJson.campaigns) ? campaignsJson.campaigns : []);
        const nc = campaignsJson.nextCursor ?? null;
        setNextCursor(nc);
        nextCursorRef.current = nc;
      }
      if (!appsRes.ok) {
        setError((prev) => prev || appsJson.error || 'Could not load applications');
        setApplications([]);
      } else {
        setApplications(Array.isArray(appsJson.applications) ? appsJson.applications : []);
      }
    } catch {
      setError('Network error');
      setCampaigns([]);
      setApplications([]);
      setNextCursor(null);
      nextCursorRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [appendAthleteCampaignFilters]);

  const loadMoreCampaigns = useCallback(async () => {
    const cur = nextCursorRef.current;
    if (cur == null || loadMoreInFlightRef.current) return;
    loadMoreInFlightRef.current = true;
    setLoadingMoreCampaigns(true);
    try {
      const csp = new URLSearchParams();
      csp.set('limit', '20');
      csp.set('cursor', cur);
      appendAthleteCampaignFilters(csp);
      const res = await authFetch(`/api/campaigns?${csp.toString()}`);
      const json = (await res.json()) as {
        campaigns?: ApiCampaignRow[];
        nextCursor?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || 'Could not load more opportunities');
        return;
      }
      const batch = Array.isArray(json.campaigns) ? json.campaigns : [];
      setCampaigns((prev) => {
        const seen = new Set(prev.map((c) => String(c.id)));
        const out = [...prev];
        for (const c of batch) {
          const id = String(c.id);
          if (!seen.has(id)) {
            seen.add(id);
            out.push(c);
          }
        }
        return out;
      });
      const nc = json.nextCursor ?? null;
      setNextCursor(nc);
      nextCursorRef.current = nc;
    } catch {
      setError((prev) => prev || 'Network error while loading opportunities');
    } finally {
      loadMoreInFlightRef.current = false;
      setLoadingMoreCampaigns(false);
    }
  }, [appendAthleteCampaignFilters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('saved_campaign_ids');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedCampaignIds(parsed.map((x) => String(x)).filter(Boolean));
      }
    } catch {
      // ignore malformed cache
    }
  }, []);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    const sync = () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(min-width: 1280px)').matches) setOpportunityGridCols(3);
      else if (window.matchMedia('(min-width: 768px)').matches) setOpportunityGridCols(2);
      else setOpportunityGridCols(1);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const applicationByCampaignId = useMemo(() => {
    const out = new Map<string, ApplicationWithCampaign['application']>();
    for (const row of applications) out.set(row.application.campaignId, row.application);
    return out;
  }, [applications]);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((c) => {
      const brandName = String(c.brandDisplayName ?? '').toLowerCase();
      return (
        String(c.name ?? '').toLowerCase().includes(q) ||
        String(c.brief ?? '').toLowerCase().includes(q) ||
        brandName.includes(q)
      );
    });
  }, [campaigns, search]);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.industry.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q)
    );
  }, [brands, search]);

  const visibleOpportunities = useMemo(() => {
    return filteredCampaigns.filter((campaign) => {
      const app = applicationByCampaignId.get(String(campaign.id));
      return !app || isWithdrawnApplication(app);
    });
  }, [filteredCampaigns, applicationByCampaignId]);

  const opportunityRows = useMemo(() => {
    const list = visibleOpportunities;
    const cols = Math.max(1, opportunityGridCols);
    const rows: ApiCampaignRow[][] = [];
    for (let i = 0; i < list.length; i += cols) {
      rows.push(list.slice(i, i + cols));
    }
    return rows;
  }, [visibleOpportunities, opportunityGridCols]);

  const opportunityRowVirtualizer = useVirtualizer({
    count: opportunityRows.length,
    getScrollElement: () => scrollParentRef.current,
    /** ~min card (248) + row gap (pb-5 = 20) — reduces first-paint overlap before measure */
    estimateSize: () => 276,
    overscan: 3,
    measureElement,
  });

  useEffect(() => {
    const root = scrollParentRef.current;
    const target = loadSentinelRef.current;
    if (!root || !target || activeTab !== 'opportunities' || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit) return;
        if (nextCursorRef.current == null) return;
        if (loadMoreInFlightRef.current) return;
        void loadMoreCampaigns();
      },
      { root, rootMargin: '360px 0px 360px 0px', threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, loadMoreCampaigns, opportunityRows.length, loading]);

  useEffect(() => {
    if (!selectedBrand || brandProfileTab !== 'campaigns') return;
    let cancelled = false;
    async function hydrateCampaignPages() {
      while (!cancelled && nextCursorRef.current != null && !loadMoreInFlightRef.current) {
        const before = nextCursorRef.current;
        await loadMoreCampaigns();
        if (cancelled) return;
        if (nextCursorRef.current === before) break;
      }
    }
    void hydrateCampaignPages();
    return () => {
      cancelled = true;
    };
  }, [selectedBrand, brandProfileTab, loadMoreCampaigns]);

  const findBrandForCampaign = useCallback(
    (campaign: ApiCampaignRow): Brand | null => {
      const name = String(campaign.brandDisplayName ?? '').trim().toLowerCase();
      if (!name) return null;
      return brands.find((b) => b.name.trim().toLowerCase() === name) ?? null;
    },
    [brands]
  );

  const campaignImageForCard = useCallback(
    (campaign: ApiCampaignRow): string => {
      const campaignImage = typeof campaign.image === 'string' ? campaign.image.trim() : '';
      if (campaignImage) return campaignImage;
      const brand = findBrandForCampaign(campaign);
      if (brand?.image) return brand.image;
      return PLACEHOLDER_IMAGE;
    },
    [findBrandForCampaign]
  );

  const submitApplyForCampaign = useCallback(
    async (campaign: ApiCampaignRow, pitch: string) => {
      setApplyTargetCampaignId(String(campaign.id));
      setError(null);
      try {
        const res = await authFetch(`/api/campaigns/${campaign.id}/applications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pitch: pitch.trim(),
            athleteSnapshot: {},
            status: 'applied',
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          if (res.status === 409) {
            // Duplicate apply should refresh state but remain a non-success UX outcome.
            await loadData();
            setError(data.error || 'You already applied to this campaign');
            return false;
          }
          setError(data.error || 'Could not apply');
          return false;
        }
        await loadData();
        return true;
      } catch {
        setError('Network error while applying');
        return false;
      } finally {
        setApplyTargetCampaignId(null);
      }
    },
    [loadData]
  );

  const toggleSaveCampaign = useCallback((campaignId: string) => {
    setSavedCampaignIds((prev) => {
      const next = prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : [...prev, campaignId];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('saved_campaign_ids', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const selectedBrandCampaigns = useMemo(() => {
    if (!selectedBrand) return [];
    const selectedName = selectedBrand.name.trim().toLowerCase();
    return campaigns.filter((c) => String(c.brandDisplayName ?? '').trim().toLowerCase() === selectedName);
  }, [campaigns, selectedBrand]);

  const savedCampaigns = useMemo(() => {
    const set = new Set(savedCampaignIds);
    return campaigns.filter((campaign) => set.has(String(campaign.id)));
  }, [campaigns, savedCampaignIds]);

  const filteredSavedCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return savedCampaigns;
    return savedCampaigns.filter((c) => {
      const brandName = String(c.brandDisplayName ?? '').toLowerCase();
      return (
        String(c.name ?? '').toLowerCase().includes(q) ||
        String(c.brief ?? '').toLowerCase().includes(q) ||
        brandName.includes(q)
      );
    });
  }, [savedCampaigns, search]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-3 pt-5">
        <DashboardPageHeader
          title="Explore"
          subtitle="Discover opportunities, explore brands, and save campaigns to revisit."
        />
      </div>

      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[min(100%,560px)] sm:pr-2">
            {activeTab === 'opportunities' ? (
              <>
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search opportunities..."
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
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </button>
              </>
            ) : (
              <label className="relative w-full min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={activeTab === 'brands' ? 'Search brands...' : 'Search saved campaigns...'}
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
              aria-selected={activeTab === 'opportunities'}
              onClick={() => setActiveTab('opportunities')}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-out ${exploreFocusRing} ${
                activeTab === 'opportunities'
                  ? 'bg-nilink-accent text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              Opportunities
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'brands'}
              onClick={() => setActiveTab('brands')}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-out ${exploreFocusRing} ${
                activeTab === 'brands'
                  ? 'bg-nilink-accent text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              Brands
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'saved'}
              onClick={() => setActiveTab('saved')}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-out ${exploreFocusRing} ${
                activeTab === 'saved'
                  ? 'bg-nilink-accent text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              Saved
            </button>
          </div>
        </div>
        {activeTab === 'opportunities' && showAdvancedFilters ? (
          <div id="explore-advanced-filters" className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <select
              value={opportunitySport}
              onChange={(e) => setOpportunitySport(e.target.value)}
              className="w-[120px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
            >
              <option value="">Sport</option>
              {OPPORTUNITY_FILTER_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={opportunityPlatform}
              onChange={(e) => setOpportunityPlatform(e.target.value)}
              className="w-[120px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
            >
              <option value="">Platform</option>
              {OPPORTUNITY_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={opportunityCategory}
              onChange={(e) => setOpportunityCategory(e.target.value)}
              className="w-[180px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
            >
              <option value="">Category</option>
              {OPPORTUNITY_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Comp min $"
              value={opportunityCompMin}
              onChange={(e) => setOpportunityCompMin(e.target.value)}
              className="w-[110px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Comp max $"
              value={opportunityCompMax}
              onChange={(e) => setOpportunityCompMax(e.target.value)}
              className="w-[110px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
            />
            <input
              type="text"
              value={opportunityLocation}
              onChange={(e) => setOpportunityLocation(e.target.value)}
              placeholder="Location"
              className="w-[160px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-gray-300 focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
            />
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs font-semibold text-nilink-accent transition-colors duration-200 ease-out hover:bg-nilink-accent/5 hover:underline ${exploreFocusRing}`}
              onClick={() => {
                setOpportunitySport('');
                setOpportunityCategory('');
                setOpportunityPlatform('');
                setOpportunityCompMin('');
                setOpportunityCompMax('');
                setOpportunityLocation('');
              }}
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      <div ref={scrollParentRef} className="dash-main-gutter-x min-h-0 flex-1 overflow-auto py-8">
        {error ? (
          <div className="mb-6 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2.5 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-nilink-accent" aria-hidden />
            <span>Loading marketplace…</span>
          </div>
        ) : null}

        {!loading && activeTab === 'opportunities' ? (
          <div className="pb-8">
            <section>
              {visibleOpportunities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200/90 bg-gray-50/80 px-5 py-12 text-center sm:py-14">
                  <p className="text-sm font-medium text-gray-900">No matching opportunities</p>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-gray-500">
                    Broaden filters or clear search to see more results. New campaigns are added over time—worth a quick
                    revisit.
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  <div
                    className="relative w-full"
                    style={{ height: opportunityRowVirtualizer.getTotalSize() }}
                  >
                    {opportunityRowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const rowCampaigns = opportunityRows[virtualRow.index];
                      if (!rowCampaigns) return null;
                      return (
                        <div
                          key={virtualRow.key}
                          data-index={virtualRow.index}
                          ref={opportunityRowVirtualizer.measureElement}
                          className={`absolute left-0 top-0 w-full pb-5 ${opportunityRowInnerGridClass(opportunityGridCols)}`}
                          style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                          {rowCampaigns.map((campaign) => {
                            const brand = findBrandForCampaign(campaign);
                            const image = campaignImageForCard(campaign);
                            const app = applicationByCampaignId.get(String(campaign.id));
                            const isWithdrawn = isWithdrawnApplication(app);
                            const isSaved = savedCampaignIds.includes(String(campaign.id));
                            const deliverables = condensedDeliverableChips(campaign);
                            const openUntil = formatOpenUntil(campaign.endDate);
                            const openUntilLabel = `Closes ${openUntil}`;
                            return (
                              <OpportunityExploreCard
                                key={String(campaign.id)}
                                content={{
                                  id: String(campaign.id),
                                  title: String(campaign.name ?? 'Campaign'),
                                  brandName: String(campaign.brandDisplayName ?? brand?.name ?? 'Brand'),
                                  imageSrc: image,
                                  imageAlt: String(campaign.name ?? 'Campaign'),
                                  chips: toOpportunityChips(deliverables),
                                  deadline: { label: openUntilLabel },
                                  compensation: {
                                    display: String(
                                      campaign.budgetHint || campaign.budget || 'Compensation shared on detail'
                                    ),
                                  },
                                  ctaLabel: 'View Deal',
                                }}
                                state={{ isSaved, isWithdrawn }}
                                callbacks={{
                                  onOpen: () => setSelectedCampaign(campaign),
                                  onToggleSave: () => toggleSaveCampaign(String(campaign.id)),
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {loadingMoreCampaigns ? (
                    <div
                      className={`mt-2 ${opportunityRowInnerGridClass(opportunityGridCols)}`}
                      aria-busy
                      aria-label="Loading more opportunities"
                    >
                      <OpportunityExploreCardPlaceholder />
                      {opportunityGridCols >= 2 ? <OpportunityExploreCardPlaceholder /> : null}
                      {opportunityGridCols >= 3 ? <OpportunityExploreCardPlaceholder /> : null}
                    </div>
                  ) : null}
                  <div
                    ref={loadSentinelRef}
                    className="pointer-events-none h-1 w-full shrink-0"
                    aria-hidden
                  />
                  {nextCursor != null ? (
                    <p className="mt-6 text-center text-xs font-medium text-gray-500" aria-live="polite">
                      Scroll to load more opportunities
                    </p>
                  ) : (
                    <div className="mt-8 border-t border-gray-100 pt-8">
                      <p className="text-center text-sm font-semibold text-gray-800">You&apos;re up to date</p>
                      <p className="mx-auto mt-2 max-w-md text-center text-xs leading-relaxed text-gray-500">
                        No more results in this feed right now. Adjust filters or check back as new campaigns go live.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {!loading && activeTab === 'saved' ? (
          savedCampaignIds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200/90 bg-gray-50/80 px-5 py-12 text-center sm:py-14">
              <p className="text-sm font-medium text-gray-900">No saved campaigns</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                Save campaigns to view later.
              </p>
            </div>
          ) : filteredSavedCampaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200/90 bg-gray-50/80 px-5 py-12 text-center sm:py-14">
              <p className="text-sm font-medium text-gray-900">No saved campaigns match your search</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                Try another keyword to filter your saved list.
              </p>
            </div>
          ) : (
            <section className="pb-8">
              <div className="mb-6 flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <h2 className={exploreSectionTitle}>Saved campaigns</h2>
                  <p className={exploreSectionSubtitle}>Your bookmarked opportunities for quick revisit.</p>
                </div>
                <span className={`shrink-0 ${exploreSectionMeta}`}>{filteredSavedCampaigns.length} saved</span>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredSavedCampaigns.map((campaign) => {
                  const brand = findBrandForCampaign(campaign);
                  const image = campaignImageForCard(campaign);
                  const deliverables = condensedDeliverableChips(campaign);
                  const openUntil = formatOpenUntil(campaign.endDate);
                  const openUntilLabel = `Closes ${openUntil}`;
                  return (
                    <OpportunityExploreCard
                      key={String(campaign.id)}
                      content={{
                        id: String(campaign.id),
                        title: String(campaign.name ?? 'Campaign'),
                        brandName: String(campaign.brandDisplayName ?? brand?.name ?? 'Brand'),
                        imageSrc: image,
                        imageAlt: String(campaign.name ?? 'Campaign'),
                        chips: toOpportunityChips(deliverables),
                        deadline: { label: openUntilLabel },
                        compensation: {
                          display: String(
                            campaign.budgetHint || campaign.budget || 'Compensation shared on detail'
                          ),
                        },
                        ctaLabel: 'View Deal',
                      }}
                      state={{ isSaved: true }}
                      callbacks={{
                        onOpen: () => setSelectedCampaign(campaign),
                        onToggleSave: () => toggleSaveCampaign(String(campaign.id)),
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-8 border-t border-gray-100 pt-8">
                <p className="text-center text-sm font-semibold text-gray-800">End of saved list</p>
                <p className="mx-auto mt-2 max-w-md text-center text-xs leading-relaxed text-gray-500">
                  Search above to filter saved campaigns, or browse Opportunities to add more.
                </p>
              </div>
            </section>
          )
        ) : null}

        {!loading && activeTab === 'brands' ? (
          filteredBrands.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200/90 bg-gray-50/80 px-5 py-12 text-center sm:py-14">
              <p className="text-sm font-medium text-gray-900">No brands match your search</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                Try a different keyword or clear the search field to browse the full partner directory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 pb-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredBrands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => {
                    setSelectedBrand(brand);
                    setBrandProfileTab('overview');
                  }}
                  className={brandDirectoryCardTokens.root}
                >
                  <div className={brandDirectoryCardTokens.bannerWrap}>
                    <ImageWithFallback
                      src={brand.image || PLACEHOLDER_IMAGE}
                      alt={brand.name}
                      className={brandDirectoryCardTokens.bannerImage}
                    />
                  </div>
                  <div className={brandDirectoryCardTokens.body}>
                    <p className={brandDirectoryCardTokens.title}>{brand.name}</p>
                    <p className={brandDirectoryCardTokens.meta}>
                      {brand.industry} · {brand.location}
                    </p>
                    <div className={brandDirectoryCardTokens.metaSpacer}>
                      <p className={brandDirectoryCardTokens.metaHint}>Open profile & campaigns</p>
                    </div>
                  </div>
                </button>
              ))}
              <div className="col-span-full mt-4 border-t border-gray-100 pt-8">
                <p className="text-center text-sm font-semibold text-gray-800">End of directory</p>
                <p className="mx-auto mt-2 max-w-md text-center text-xs leading-relaxed text-gray-500">
                  Refine search to narrow partners, or switch tabs to browse live opportunities.
                </p>
              </div>
            </div>
          )
        ) : null}
      </div>

      {selectedCampaign ? (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/40">
          <div className="h-full w-full max-w-[1100px] overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-end border-b border-gray-100 px-6 py-4">
              <button
                type="button"
                className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 ease-out hover:bg-gray-50 active:bg-gray-100 ${exploreFocusRing}`}
                onClick={() => setSelectedCampaign(null)}
              >
                Close
              </button>
            </div>

            <div className="grid h-[calc(100vh-73px)] grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_360px] lg:gap-0">
              <div className="min-w-0 border-gray-100 bg-white px-6 py-6 lg:border-r lg:pr-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  {String(selectedCampaign.name ?? 'Campaign')}
                </h2>
                {findBrandForCampaign(selectedCampaign) ? (
                  <button
                    type="button"
                    className={`mt-2 block text-left text-sm font-medium text-gray-500 underline-offset-2 transition-colors duration-200 ease-out hover:text-nilink-accent hover:underline ${exploreFocusRing} rounded-sm`}
                    onClick={() => {
                      const brand = findBrandForCampaign(selectedCampaign);
                      if (brand) {
                        setSelectedBrand(brand);
                        setBrandProfileTab('overview');
                        setActiveTab('brands');
                        setSelectedCampaign(null);
                      }
                    }}
                  >
                    {String(selectedCampaign.brandDisplayName ?? 'Brand')}
                  </button>
                ) : (
                  <p className="mt-2 text-sm font-medium text-gray-500">{String(selectedCampaign.brandDisplayName ?? 'Brand')}</p>
                )}
                <div className="mt-4 h-48 overflow-hidden rounded-xl border border-gray-100 bg-gray-100 sm:h-52">
                  <ImageWithFallback
                    src={campaignImageForCard(selectedCampaign)}
                    alt={String(selectedCampaign.name ?? 'Campaign')}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="mt-8 space-y-10 border-t border-gray-100 pt-8">
                  <section>
                    {detailSectionTitle('Description')}
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-gray-700">
                      {String(selectedCampaign.brief || 'No description provided.')}
                    </p>
                  </section>
                  <section className="border-t border-gray-100 pt-8">
                    {detailSectionTitle('Requirements')}
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-700">
                      <li>Sport: {String(selectedCampaign.sport || 'All sports')}</li>
                      <li>Minimum followers: {selectedCampaign.followerMin ? String(selectedCampaign.followerMin) : 'Not specified'}</li>
                      <li>Minimum engagement: {selectedCampaign.engagementMinPct ? `${selectedCampaign.engagementMinPct}%` : 'Not specified'}</li>
                    </ul>
                  </section>
                  <section className="border-t border-gray-100 pt-8">
                    {detailSectionTitle('Deliverables')}
                    {Array.isArray(selectedCampaign.packageDetails) && selectedCampaign.packageDetails.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-700">
                        {selectedCampaign.packageDetails.slice(0, 5).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-gray-600">Deliverables are finalized after offer acceptance.</p>
                    )}
                  </section>
                  <section className="border-t border-gray-100 pt-8">
                    {detailSectionTitle('Timeline')}
                    <p className="mt-3 text-sm text-gray-700">
                      {formatDate(selectedCampaign.startDate)} – {formatDate(selectedCampaign.endDate)}
                    </p>
                  </section>
                  <section className="border-t border-gray-100 pt-8">
                    {detailSectionTitle('Compensation')}
                    <p className="mt-3 text-sm font-medium text-gray-800">
                      {String(selectedCampaign.budgetHint || selectedCampaign.budget || 'Shared if selected')}
                    </p>
                  </section>
                </div>
              </div>

              <div className="lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-73px)] lg:overflow-y-auto lg:bg-gray-50/80 lg:px-6 lg:py-6">
                <div className="mx-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-md ring-1 ring-black/[0.04] transition-shadow duration-200 ease-out">
                  <h3 className="text-lg font-bold tracking-tight text-gray-900">Apply to campaign</h3>
                  <div className="mt-6 space-y-5 text-sm">
                    <div>
                      <p className={explorePanelLabel}>Compensation</p>
                      <p className="mt-2 font-medium text-gray-800">
                        {String(selectedCampaign.budgetHint || selectedCampaign.budget || 'Shared if selected')}
                      </p>
                    </div>
                    <div>
                      <p className={explorePanelLabel}>Deadline</p>
                      <p className="mt-2 font-medium text-gray-800">
                        {formatDate(selectedCampaign.endDate || selectedCampaign.createdAt)}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const app = applicationByCampaignId.get(String(selectedCampaign.id));
                    const hasBlockingApplication = app != null && !isWithdrawnApplication(app);
                    if (hasBlockingApplication) {
                      return (
                        <div className="mt-6 rounded-xl border border-gray-200/90 bg-gray-50/90 px-4 py-3 text-sm leading-relaxed text-gray-700">
                          You already have an active application for this campaign. Track updates from the{' '}
                          <Link href="/dashboard/applications" className="font-medium text-nilink-accent underline-offset-2 hover:underline">
                            Applications
                          </Link>{' '}
                          page.
                        </div>
                      );
                    }
                    return (
                      <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
                        <label className="sr-only" htmlFor="athlete-explore-apply-pitch">
                          Application pitch (optional)
                        </label>
                        <textarea
                          id="athlete-explore-apply-pitch"
                          value={applyPitch}
                          onChange={(e) => setApplyPitch(e.target.value)}
                          rows={5}
                          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-[border-color,box-shadow] duration-200 ease-out focus:border-nilink-accent/40 focus:outline-none focus:ring-2 focus:ring-nilink-accent/15 focus:ring-offset-0"
                          placeholder="Application pitch (optional)"
                          aria-label="Application pitch (optional)"
                        />
                        <button
                          type="button"
                          disabled={applyTargetCampaignId === String(selectedCampaign.id)}
                          onClick={async () => {
                            const ok = await submitApplyForCampaign(selectedCampaign, applyPitch);
                            if (ok) setApplyPitch('');
                          }}
                          className={`w-full rounded-lg bg-nilink-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-[opacity,transform,filter] duration-200 ease-out hover:brightness-105 active:brightness-95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 motion-reduce:active:scale-100 ${exploreFocusRing}`}
                        >
                          {applyTargetCampaignId === String(selectedCampaign.id) ? 'Applying...' : 'Apply to Campaign'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedBrand ? (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/40">
          <div
            className="flex h-full w-full max-w-[1000px] flex-col overflow-hidden bg-slate-50 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="explore-brand-profile-title"
          >
            <header className="relative shrink-0 bg-slate-900 text-white">
              <div className="relative aspect-[5/3] max-h-[220px] min-h-[160px] w-full overflow-hidden bg-slate-800 sm:aspect-[21/9] sm:max-h-[240px]">
                <ImageWithFallback
                  src={brandBannerSrc(selectedBrand)}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-transparent"
                  aria-hidden
                />
              </div>
              <button
                type="button"
                className={`absolute right-4 top-4 z-10 rounded-lg border border-white/30 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur-sm transition-colors duration-200 ease-out hover:bg-white active:bg-white/90 ${exploreFocusRing}`}
                onClick={() => setSelectedBrand(null)}
              >
                Close
              </button>

              <div className="relative border-t border-white/10 px-6 pb-6 pt-0">
                <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:gap-6">
                  <div className="flex shrink-0 justify-center sm:justify-start">
                    <div className="h-[88px] w-[88px] overflow-hidden rounded-2xl border-4 border-slate-900 bg-white shadow-xl ring-1 ring-white/25 sm:h-24 sm:w-24">
                      <ImageWithFallback
                        src={brandLogoSrc(selectedBrand)}
                        alt={`${selectedBrand.name} logo`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pb-0.5 text-center sm:pb-1 sm:text-left">
                    <div className="mb-1.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      {selectedBrand.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                          Verified
                        </span>
                      ) : null}
                    </div>
                    <h2 id="explore-brand-profile-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {selectedBrand.name}
                    </h2>
                    <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-slate-300 sm:justify-start">
                      <span className="font-medium text-slate-200">{selectedBrand.industry}</span>
                      <span className="text-slate-500" aria-hidden>
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                        {selectedBrand.location}
                      </span>
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-200/95">{brandTagline(selectedBrand)}</p>
                  </div>
                </div>
              </div>
            </header>

            <nav
              className="shrink-0 border-b border-gray-200 bg-white px-6 py-4"
              aria-label="Brand profile sections"
            >
              <div className="flex max-w-4xl gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  id="explore-brand-tab-overview"
                  aria-selected={brandProfileTab === 'overview'}
                  aria-controls="explore-brand-panel-overview"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-out active:scale-[0.99] motion-reduce:active:scale-100 ${exploreFocusRing} ${
                    brandProfileTab === 'overview' ? 'bg-white text-nilink-ink shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setBrandProfileTab('overview')}
                >
                  Overview
                </button>
                <button
                  type="button"
                  role="tab"
                  id="explore-brand-tab-campaigns"
                  aria-selected={brandProfileTab === 'campaigns'}
                  aria-controls="explore-brand-panel-campaigns"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-out active:scale-[0.99] motion-reduce:active:scale-100 ${exploreFocusRing} ${
                    brandProfileTab === 'campaigns' ? 'bg-white text-nilink-ink shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setBrandProfileTab('campaigns')}
                >
                  Campaigns
                </button>
              </div>
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:py-10">
              {brandProfileTab === 'overview' ? (
                <div
                  id="explore-brand-panel-overview"
                  role="tabpanel"
                  aria-labelledby="explore-brand-tab-overview"
                  className="mx-auto max-w-4xl space-y-8"
                >
                  <section
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7"
                    aria-labelledby="explore-brand-about-heading"
                  >
                    <h3 id="explore-brand-about-heading" className={explorePanelLabel}>
                      About
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-gray-700">
                      {selectedBrand.bio || 'No overview available for this brand yet.'}
                    </p>
                  </section>

                  <section
                    className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white via-white to-emerald-50/50 p-6 shadow-sm sm:p-7"
                    aria-labelledby="explore-brand-trust-heading"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                        <ShieldCheck className="h-5 w-5" aria-hidden />
                      </div>
                      <h3 id="explore-brand-trust-heading" className="text-lg font-bold tracking-tight text-gray-900">
                        Trust & verification
                      </h3>
                    </div>
                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-1">
                      <div className="flex flex-col rounded-xl border border-gray-100 bg-white/80 px-4 py-3 transition-shadow duration-200 ease-out hover:shadow-sm">
                        <dt className={explorePanelLabel}>Category</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{selectedBrand.industry}</dd>
                      </div>
                      <div className="flex flex-col rounded-xl border border-gray-100 bg-white/80 px-4 py-3 transition-shadow duration-200 ease-out hover:shadow-sm">
                        <dt className={explorePanelLabel}>Location</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{selectedBrand.location}</dd>
                      </div>
                      <div className="flex flex-col rounded-xl border border-gray-100 bg-white/80 px-4 py-3 transition-shadow duration-200 ease-out hover:shadow-sm">
                        <dt className={explorePanelLabel}>Verified status</dt>
                        <dd className="mt-1 font-semibold text-gray-900">
                          {selectedBrand.verified ? 'Verified on NILINK' : 'Not verified'}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>
              ) : (
                <div
                  id="explore-brand-panel-campaigns"
                  role="tabpanel"
                  aria-labelledby="explore-brand-tab-campaigns"
                  className="mx-auto max-w-4xl space-y-8"
                >
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
                    <div className="flex flex-col gap-2 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <h3 className={exploreSectionTitle}>Active campaigns</h3>
                        <p className={exploreSectionSubtitle}>
                          Open roles from this brand—open details to review requirements and apply.
                        </p>
                      </div>
                    </div>
                    {selectedBrandCampaigns.length === 0 ? (
                      <div className="mt-8 rounded-xl border border-dashed border-gray-200/90 bg-gray-50/80 px-5 py-12 text-center sm:py-14">
                        <p className="text-sm font-medium text-gray-900">No active listings right now</p>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                          This brand does not have open campaigns in your current feed. Check Explore opportunities for the
                          latest marketplace additions.
                        </p>
                      </div>
                    ) : (
                      <ul className="mt-6 list-none space-y-3 p-0">
                        {selectedBrandCampaigns.map((c) => {
                          const app = applicationByCampaignId.get(String(c.id));
                          const hasBlockingApplication = app != null && !isWithdrawnApplication(app);
                          return (
                            <li key={String(c.id)}>
                              <div
                                className={`rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5 ${exploreInteractiveSurface} hover:border-gray-300/90 hover:bg-white hover:shadow-sm`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className={`truncate ${exploreCardTitle}`}>{String(c.name || 'Campaign')}</p>
                                    <p className={`mt-1 truncate ${exploreCardMeta}`}>
                                      {String(c.budgetHint || c.budget || 'Compensation shared in detail')}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBrand(null);
                                      setSelectedCampaign(c);
                                    }}
                                    className={`shrink-0 rounded-lg bg-nilink-accent px-3 py-2 text-xs font-bold text-white shadow-sm transition-[filter,transform] duration-200 ease-out hover:brightness-105 active:brightness-95 active:scale-[0.98] motion-reduce:active:scale-100 ${exploreFocusRing}`}
                                  >
                                    {hasBlockingApplication ? 'View' : 'Apply'}
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  <details className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 ease-out open:ring-1 open:ring-gray-200">
                    <summary
                      className={`cursor-pointer list-none text-sm font-semibold text-gray-800 marker:hidden outline-none [&::-webkit-details-marker]:hidden ${exploreFocusRing} rounded-md px-0.5 py-0.5`}
                    >
                      Past campaigns
                    </summary>
                    <p className="mt-4 text-sm leading-relaxed text-gray-500">
                      Historical campaign performance will appear here in a future release.
                    </p>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
