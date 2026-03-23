'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Eye,
  Facebook,
  Heart,
  Instagram,
  MapPin,
  Play,
  Plus,
  Users,
} from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { getAthleteById, mockAthletes, type ContentItem } from '@/lib/mockData';

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

type ProfileTab = 'overview' | 'content';
type ContentFilter = 'all' | 'photos' | 'videos';

function ContentCard({ item, showPlay }: { item: ContentItem; showPlay: boolean }) {
  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 shadow-sm">
      <ImageWithFallback src={item.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      {showPlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-nilink-ink shadow-md">
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>
      )}
      {item.overlayText && showPlay && (
        <p className="absolute bottom-14 left-2 right-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-white drop-shadow-md sm:text-xs">
          {item.overlayText}
        </p>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-medium text-white drop-shadow">
        <Eye className="h-3.5 w-3.5 opacity-90" strokeWidth={2.5} />
        {item.views}
      </div>
    </div>
  );
}

function CreateOfferButton({ compact }: { compact?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      className={
        compact
          ? 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 sm:text-sm sm:px-4'
          : 'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800'
      }
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Plus className={`h-4 w-4 transition-transform ${hover ? 'rotate-90' : ''}`} />
      Create Offer
    </button>
  );
}

export function AthleteProfile() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');

  const athlete = useMemo(() => {
    if (idParam) {
      const found = getAthleteById(idParam);
      if (found) return found;
    }
    return mockAthletes[0];
  }, [idParam]);

  const [tab, setTab] = useState<ProfileTab>('overview');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);

  const updateCollapsed = useCallback(() => {
    const main = document.querySelector('main');
    const hero = heroRef.current;
    if (!main || !hero) return;
    const mainRect = main.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const threshold = mainRect.top + 4;
    setHeaderCollapsed(heroRect.bottom < threshold);
  }, []);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    updateCollapsed();
    main.addEventListener('scroll', updateCollapsed, { passive: true });
    window.addEventListener('resize', updateCollapsed, { passive: true });
    return () => {
      main.removeEventListener('scroll', updateCollapsed);
      window.removeEventListener('resize', updateCollapsed);
    };
  }, [updateCollapsed, athlete.id]);

  const images = athlete.contentItems.filter((c) => c.type === 'image');
  const videos = athlete.contentItems.filter((c) => c.type === 'video');
  const previewItems = athlete.contentItems.slice(0, 5);

  const filteredContent = useMemo(() => {
    if (contentFilter === 'photos') return images;
    if (contentFilter === 'videos') return videos;
    return athlete.contentItems;
  }, [athlete.contentItems, contentFilter, images, videos]);

  const filterChips: { id: ContentFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
  ];

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'content', label: 'Content' },
  ];

  return (
    <div className="min-h-full bg-nilink-page pb-16">
      <div className="mx-auto max-w-4xl px-5 pt-4 sm:px-8 sm:pt-6">
        <div className="mb-5">
          <Link
            href="/dashboard/search"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-nilink-ink"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back
          </Link>
        </div>

        {/* Full hero */}
        <div ref={heroRef} className="mb-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="relative h-40 sm:h-48">
            <ImageWithFallback src={athlete.bannerImage} alt="" className="h-full w-full object-cover" />
          </div>

          <div className="relative px-5 pb-6 pt-0 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative -mt-16 shrink-0 sm:-mt-20">
                  <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-md sm:h-32 sm:w-32">
                    <ImageWithFallback src={athlete.image} alt={athlete.name} className="h-full w-full object-cover" />
                  </div>
                  <div
                    className="absolute -right-0.5 -top-0.5 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-emerald-500 text-xs font-bold text-white shadow-sm"
                    title="Brand fit score"
                  >
                    {athlete.nilScore}
                  </div>
                </div>

                <div className="min-w-0 flex-1 pb-0 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{athlete.name}</h1>
                    {athlete.verified ? <VerifiedBadge className="h-6 w-6 text-nilink-accent" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {athlete.sport} | {athlete.school}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Instagram className="h-4 w-4 text-pink-600" />
                      {athlete.stats.instagram}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <TiktokIcon className="h-4 w-4 text-nilink-ink" />
                      {athlete.stats.tiktok}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      {athlete.stats.facebook}
                    </span>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {athlete.hometown}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {athlete.position} · {athlete.jerseyNumber}
                    </span>
                  </p>
                </div>
              </div>

              <CreateOfferButton />
            </div>
          </div>
        </div>

        {/* Condensed sticky bar — same width & radius as hero; smooth height/opacity */}
        <div
          className={`sticky top-0 z-30 w-full overflow-hidden rounded-2xl border bg-white/95 backdrop-blur-md transition-[height,opacity,margin,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
            headerCollapsed
              ? 'mt-3 h-[72px] border-gray-100 opacity-100 shadow-sm'
              : 'pointer-events-none mt-0 h-0 border-transparent opacity-0 shadow-none'
          }`}
          aria-hidden={!headerCollapsed}
        >
          <div className="flex h-[72px] items-center justify-between gap-3 px-5 sm:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-100 shadow-sm sm:h-11 sm:w-11">
                <ImageWithFallback src={athlete.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-gray-900 sm:text-base">{athlete.name}</span>
                  {athlete.verified ? <VerifiedBadge className="h-4 w-4 shrink-0 text-nilink-accent" /> : null}
                </div>
                <p className="truncate text-xs text-gray-500">
                  {athlete.sport} · {athlete.stats.instagram} IG
                </p>
              </div>
            </div>
            <CreateOfferButton compact />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 mt-8 border-b border-gray-200">
          <div className="flex justify-center gap-0 sm:gap-4">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative flex-1 px-3 py-3 text-center text-sm font-semibold sm:flex-none sm:min-w-[120px] ${
                    active ? 'text-nilink-ink' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.label}
                  {active ? (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gray-900" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900">About</h2>
              <p className="mt-3 leading-relaxed text-gray-600">{athlete.bio}</p>
              <dl className="mt-6 grid gap-3 border-t border-gray-100 pt-6 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-400">Academic year</dt>
                  <dd className="font-medium text-gray-900">{athlete.academicYear}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Major</dt>
                  <dd className="font-medium text-gray-900">{athlete.major}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Height / weight</dt>
                  <dd className="font-medium text-gray-900">{athlete.heightWeight}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Compatibility</dt>
                  <dd className="font-medium text-nilink-accent">{athlete.compatibilityScore}% match</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Reach snapshot</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total followers', value: athlete.aggregate.totalFollowers, icon: Users },
                  { label: 'Engagement', value: athlete.aggregate.engagementRate, icon: Heart },
                  { label: 'Total views', value: athlete.aggregate.totalViews, icon: Eye },
                  { label: 'Posts / mo', value: String(athlete.aggregate.monthlyPosts), icon: BarChart3 },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-gray-100 bg-white px-4 py-4 shadow-sm"
                  >
                    <s.icon className="mb-2 h-4 w-4 text-nilink-accent" />
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Content</h2>
                <button
                  type="button"
                  onClick={() => setTab('content')}
                  className="text-sm font-semibold text-nilink-accent hover:underline"
                >
                  See all
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {previewItems.map((item) => (
                  <div key={item.id} className="w-[38%] shrink-0 sm:w-[30%]">
                    <ContentCard item={item} showPlay={item.type === 'video'} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900">Achievements</h2>
              <ul className="mt-4 space-y-3">
                {athlete.achievements.map((line) => (
                  <li key={line} className="flex gap-3 text-gray-700">
                    <Award className="mt-0.5 h-5 w-5 shrink-0 text-nilink-accent" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">Platform performance</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {(
                  [
                    { key: 'instagram', label: 'Instagram', Icon: Instagram, m: athlete.platformMetrics.instagram },
                    { key: 'tiktok', label: 'TikTok', Icon: TiktokIcon, m: athlete.platformMetrics.tiktok },
                    { key: 'facebook', label: 'Facebook', Icon: Facebook, m: athlete.platformMetrics.facebook },
                  ] as const
                ).map(({ key, label, Icon, m }) => (
                  <div key={key} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-nilink-ink" />
                      <span className="font-bold text-gray-900">{label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{m.handle}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">Followers</p>
                        <p className="text-lg font-bold text-gray-900">{m.followers}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">Posts/mo</p>
                        <p className="text-lg font-bold text-gray-900">{m.postsPerMonth}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">Eng.</p>
                        <p className="text-lg font-bold text-nilink-accent">{m.engagementRate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Deal availability</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {athlete.openToDeals
                      ? 'This athlete is accepting new sponsorship conversations.'
                      : 'Not accepting new deals at the moment.'}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-bold ${
                    athlete.openToDeals ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {athlete.openToDeals ? 'Open to deals' : 'Unavailable'}
                </span>
              </div>
            </section>
          </div>
        )}

        {tab === 'content' && (
          <div>
            <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm font-semibold text-gray-700">
                Content{' '}
                <span className="font-normal text-gray-400">
                  ({filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'})
                </span>
              </p>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5 sm:absolute sm:right-0 sm:top-0">
                {filterChips.map((chip) => {
                  const on = contentFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setContentFilter(chip.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition sm:text-[13px] ${
                        on
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {filteredContent.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 py-12 text-center text-sm text-gray-500">
                No {contentFilter === 'photos' ? 'photos' : contentFilter === 'videos' ? 'videos' : 'content'} to show.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredContent.map((item) => (
                  <ContentCard key={item.id} item={item} showPlay={item.type === 'video'} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
