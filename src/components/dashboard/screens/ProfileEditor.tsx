'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Save, Instagram, Twitter, TrendingUp, Eye, Loader2 } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/authFetch';
import {
  defaultAthleteProfile,
  mergeAthleteProfile,
  type AthleteProfile,
} from '@/lib/auth/athleteProfile';
import { userAvatarDataUrl } from '@/lib/userAvatar';

const SPORTS = [
  'Basketball',
  'Football',
  'Baseball',
  'Soccer',
  'Volleyball',
  'Track & Field',
  'Swimming',
  'Tennis',
  'Softball',
  'Cheerleading',
  'Dance',
  'Other',
] as const;

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'] as const;

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-1 focus:ring-nilink-accent/30';
const labelClass = 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2
        className="mb-5 text-xl font-black uppercase tracking-wide text-nilink-ink"
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

type MeResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    athleteProfile?: AthleteProfile;
  };
};

export function ProfileEditor() {
  const { refreshUser } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [name, setName] = useState('');
  const [profile, setProfile] = useState<AthleteProfile>(() => defaultAthleteProfile());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authFetch('/api/auth/me');
      const data = (await res.json()) as MeResponse & { error?: string };
      if (!res.ok) {
        setLoadError(data.error || 'Could not load profile');
        return;
      }
      setName(data.user.name ?? '');
      setProfile(mergeAthleteProfile(data.user.athleteProfile));
    } catch {
      setLoadError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchField = <K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          athleteProfile: profile,
        }),
      });
      const data = (await res.json()) as MeResponse & { error?: string };
      if (!res.ok) {
        setSaveError(data.error || 'Could not save');
        return;
      }
      setName(data.user.name ?? name);
      setProfile(mergeAthleteProfile(data.user.athleteProfile));
      setSaveOk(true);
      await refreshUser();
      window.setTimeout(() => setSaveOk(false), 4000);
    } catch {
      setSaveError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc =
    profile.imageUrl?.trim().length > 0 ? profile.imageUrl.trim() : userAvatarDataUrl(name || 'Athlete');

  if (loading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-nilink-page py-20 font-sans text-nilink-ink">
        <Loader2 className="h-8 w-8 animate-spin text-nilink-accent" aria-hidden />
        <p className="text-sm text-gray-500">Loading profile…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="dash-main-gutter-x min-h-full bg-nilink-page py-12 font-sans text-nilink-ink">
        <p className="text-sm text-amber-800">
          {loadError}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-nilink-page font-sans text-nilink-ink">
      <div className="shrink-0 border-b border-gray-100 bg-white py-8 dash-main-gutter-x">
        <div className="mb-2 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <DashboardPageHeader
            title="Profile"
            subtitle="Build your professional NIL presence"
            className="min-w-0 flex-1"
          />
          <Link
            href="/dashboard/profile/view"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-nilink-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-nilink-accent-hover"
          >
            <Eye className="h-4 w-4" aria-hidden />
            View public profile
          </Link>
        </div>
      </div>

      <div className="flex-1 space-y-6 py-8 dash-main-gutter-x md:py-10">
        {saveError && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {saveError}
          </p>
        )}
        {saveOk && (
          <p className="rounded-xl border border-nilink-accent-border bg-nilink-accent-soft px-4 py-3 text-sm font-medium text-nilink-ink">
            Profile saved.
          </p>
        )}

        <SectionCard title="Profile photo">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm">
              <ImageWithFallback src={avatarSrc} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className={labelClass}>Image URL (optional)</label>
              <input
                type="url"
                value={profile.imageUrl}
                onChange={(e) => patchField('imageUrl', e.target.value)}
                className={inputClass}
                placeholder="https://…"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Leave blank to use your initials. Photo upload coming later.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Basic information">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="profile-name">
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                autoComplete="name"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-sport">
                Sport
              </label>
              <select
                id="profile-sport"
                value={profile.sport || ''}
                onChange={(e) => patchField('sport', e.target.value)}
                className={inputClass}
              >
                <option value="">Select sport</option>
                {profile.sport &&
                  !(SPORTS as readonly string[]).includes(profile.sport) && (
                    <option value={profile.sport}>{profile.sport}</option>
                  )}
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-position">
                Position
              </label>
              <input
                id="profile-position"
                type="text"
                value={profile.position}
                onChange={(e) => patchField('position', e.target.value)}
                className={inputClass}
                placeholder="e.g. Point guard"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-school">
                School
              </label>
              <input
                id="profile-school"
                type="text"
                value={profile.school}
                onChange={(e) => patchField('school', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-year">
                Year
              </label>
              <select
                id="profile-year"
                value={profile.year || ''}
                onChange={(e) => patchField('year', e.target.value)}
                className={inputClass}
              >
                <option value="">Select year</option>
                {profile.year &&
                  !(YEARS as readonly string[]).includes(profile.year) && (
                    <option value={profile.year}>{profile.year}</option>
                  )}
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Bio">
          <label className="sr-only" htmlFor="profile-bio">
            Bio
          </label>
          <textarea
            id="profile-bio"
            value={profile.bio}
            onChange={(e) => patchField('bio', e.target.value)}
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="Tell brands about yourself…"
          />
        </SectionCard>

        <SectionCard title="Achievements">
          <label className="sr-only" htmlFor="profile-achievements">
            Achievements
          </label>
          <textarea
            id="profile-achievements"
            value={profile.achievements}
            onChange={(e) => patchField('achievements', e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Honors, stats, GPA…"
          />
        </SectionCard>

        <SectionCard title="Social media">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={`${labelClass} flex items-center gap-2`}>
                  <Instagram className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                  Instagram
                </label>
                <input
                  type="text"
                  value={profile.instagram}
                  onChange={(e) => patchField('instagram', e.target.value)}
                  className={inputClass}
                  placeholder="@handle"
                />
              </div>
              <div>
                <label className={`${labelClass} flex items-center gap-2`}>
                  <TrendingUp className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                  Instagram followers
                </label>
                <input
                  type="text"
                  value={profile.instagramFollowers}
                  onChange={(e) => patchField('instagramFollowers', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 12.5K"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={`${labelClass} flex items-center gap-2`}>
                  <Twitter className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                  X (Twitter)
                </label>
                <input
                  type="text"
                  value={profile.twitter}
                  onChange={(e) => patchField('twitter', e.target.value)}
                  className={inputClass}
                  placeholder="@handle"
                />
              </div>
              <div>
                <label className={`${labelClass} flex items-center gap-2`}>
                  <TrendingUp className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                  X followers
                </label>
                <input
                  type="text"
                  value={profile.twitterFollowers}
                  onChange={(e) => patchField('twitterFollowers', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>TikTok</label>
                <input
                  type="text"
                  value={profile.tiktok}
                  onChange={(e) => patchField('tiktok', e.target.value)}
                  className={inputClass}
                  placeholder="@handle"
                />
              </div>
              <div>
                <label className={`${labelClass} flex items-center gap-2`}>
                  <TrendingUp className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                  TikTok followers
                </label>
                <input
                  type="text"
                  value={profile.tiktokFollowers}
                  onChange={(e) => patchField('tiktokFollowers', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end pb-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-nilink-accent px-8 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Save profile
          </button>
        </div>
      </div>
    </div>
  );
}
