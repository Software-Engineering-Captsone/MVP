'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Pencil,
} from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { loadOnboardingState, hydrateOnboardingDraft } from '@/lib/onboardingHydrate';
import { userAvatarDataUrl } from '@/lib/userAvatar';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import type { OnboardingBasics, OnboardingAcademic, OnboardingCompliance, OnboardingProfile, SportEntry } from '@/hooks/useOnboardingStorage';

/* ── Platform icons ── */
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);
const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  available:   { label: 'Open to Deals',         color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  busy:        { label: 'Limited Availability',   color: 'bg-amber-50   text-amber-700   border-amber-200'   },
  not_looking: { label: 'Not Looking',            color: 'bg-gray-100   text-gray-600    border-gray-200'    },
};

function formatFollowers(value: string | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

export function ProfileView() {
  const { user: sessionUser } = useDashboard();

  const [loading, setLoading] = useState(true);
  const [basics, setBasics]       = useState<OnboardingBasics | null>(null);
  const [sports, setSports]       = useState<SportEntry[]>([]);
  const [academic, setAcademic]   = useState<OnboardingAcademic | null>(null);
  const [compliance, setCompliance] = useState<OnboardingCompliance | null>(null);
  const [profile, setProfile]     = useState<OnboardingProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const state = await loadOnboardingState();
      const draft = hydrateOnboardingDraft(state);
      setBasics(draft.basics);
      setSports(draft.athletic.sports);
      setAcademic(draft.academic);
      setCompliance(draft.compliance);
      setProfile(draft.profile);
    } catch { /* non-fatal — show empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const name = basics?.fullName || sessionUser?.name || '';
  const avatarSrc = profile?.profilePictureUrl?.trim()
    ? profile.profilePictureUrl.trim()
    : userAvatarDataUrl(name || 'Athlete');

  const primarySport = sports[0];
  const availInfo = profile?.availabilityStatus
    ? AVAILABILITY_LABELS[profile.availabilityStatus]
    : null;

  const instagramFollowers = formatFollowers(profile?.socials.instagramFollowers);
  const tiktokFollowers = formatFollowers(profile?.socials.tiktokFollowers);

  if (loading) {
    return (
      <div className="min-h-full animate-pulse bg-nilink-page pb-16 font-sans text-nilink-ink">
        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-8 w-28 rounded-lg bg-gray-200" />
          </div>
          <div className="mb-4 h-9 rounded-xl bg-gray-100" />
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="h-36 w-full bg-gray-200 sm:h-44" />
            <div className="px-6 pb-8 pt-4">
              <div className="-mt-10 h-20 w-20 rounded-full border-4 border-white bg-gray-300 shadow-sm" />
              <div className="mt-3 h-6 w-44 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-32 rounded bg-gray-200" />
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-xl bg-gray-100" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-nilink-page pb-16 font-sans text-nilink-ink">
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">

        {/* Nav row */}
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-nilink-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back to editor
          </Link>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-nilink-ink shadow-sm transition hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit profile
          </Link>
        </div>

        {/* Preview notice */}
        <p className="mb-4 rounded-xl border border-nilink-accent-border bg-nilink-accent-soft px-4 py-2.5 text-xs font-medium text-nilink-ink">
          This is a preview of your public profile — exactly what brands see when they find you.
        </p>

        {/* Profile card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          {/* Banner */}
          <div className="relative h-36 w-full bg-gradient-to-br from-nilink-accent-soft to-gray-100 sm:h-44">
            {profile?.profileBannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profileBannerUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          {/* Avatar + meta */}
          <div className="relative px-5 pb-6 pt-0 sm:px-8">
            {/* Avatar overlapping banner */}
            <div className="absolute -top-12 left-5 sm:left-8">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md sm:h-28 sm:w-28">
                <ImageWithFallback src={avatarSrc} alt={name} className="h-full w-full object-cover" />
              </div>
            </div>

            {/* Availability + verification badges — top right */}
            <div className="flex justify-end pt-3 gap-2 flex-wrap">
              {availInfo && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${availInfo.color}`}>
                  {availInfo.label}
                </span>
              )}
              {compliance?.schoolEmailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-nilink-accent-border bg-nilink-accent-soft px-3 py-1 text-xs font-semibold text-nilink-accent">
                  <BadgeCheck className="h-3.5 w-3.5" /> School verified
                </span>
              )}
            </div>

            {/* Name + sport + school */}
            <div className="mt-14">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{name || '—'}</h1>
              {(primarySport || academic?.school) && (
                <p className="mt-1 text-sm text-gray-500">
                  {[primarySport?.sport, primarySport?.position, academic?.school]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {(academic?.currentYear || academic?.eligibilityYears) && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {[academic.currentYear, academic.eligibilityYears ? `${academic.eligibilityYears} yr eligibility` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="mt-4 text-sm leading-relaxed text-gray-600">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Social metrics card */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">Social media</h2>
          <div className="space-y-2">

            {/* Instagram */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <InstagramIcon className="h-4 w-4 shrink-0 text-pink-500" />
                <span className="text-xs font-semibold text-gray-700">Instagram</span>
                {profile?.socials.instagram ? (
                  <span className="truncate text-xs text-gray-500">
                    {profile.socials.instagram}
                    {instagramFollowers && <> · {instagramFollowers} followers</>}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Not added</span>
                )}
              </div>
            </div>

            {/* TikTok */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <TiktokIcon className="h-4 w-4 shrink-0 text-nilink-ink" />
                <span className="text-xs font-semibold text-gray-700">TikTok</span>
                {profile?.socials.tiktok ? (
                  <span className="truncate text-xs text-gray-500">
                    {profile.socials.tiktok}
                    {tiktokFollowers && <> · {tiktokFollowers} followers</>}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Not added</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sports detail card */}
        {sports.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">Sports</h2>
            <div className="space-y-2">
              {sports.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{s.sport}</p>
                    {s.position && <p className="text-xs text-gray-500">{s.position}</p>}
                  </div>
                  {i === 0 && (
                    <span className="shrink-0 rounded-full border border-nilink-accent-border bg-nilink-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-nilink-accent">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
