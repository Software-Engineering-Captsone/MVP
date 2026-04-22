'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Save, Instagram, Twitter, Eye, Loader2, Upload, RotateCcw,
  Plus, X, ShieldCheck, BadgeCheck,
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { PhotoCropModal } from '@/components/ui/PhotoCropModal';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/authFetch';
import { uploadAvatar } from '@/lib/avatarUpload';
import { loadOnboardingState, hydrateOnboardingDraft } from '@/lib/onboardingHydrate';
import {
  persistBasics,
  persistAthletic,
  persistAcademic,
  persistCompliance,
  persistProfileSection,
} from '@/lib/onboardingPersist';
import {
  defaultDraft,
  type OnboardingBasics,
  type OnboardingAcademic,
  type OnboardingCompliance,
  type OnboardingProfile,
  type SportEntry,
} from '@/hooks/useOnboardingStorage';
import { userAvatarDataUrl } from '@/lib/userAvatar';

const SPORTS = [
  'Basketball', 'Football', 'Baseball', 'Soccer', 'Volleyball',
  'Track & Field', 'Swimming', 'Tennis', 'Softball', 'Cheerleading',
  'Dance', 'Other',
] as const;

const YEARS = [
  'Freshman', 'Sophomore', 'Junior', 'Senior',
  'Graduate / 5th Year', 'Redshirt',
] as const;

const ELIGIBILITY_STATUSES = ['Active', 'Inactive', 'Pending', 'Graduated'] as const;
const CONTACT_PREFS: { value: OnboardingBasics['contactPreference']; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'both',  label: 'Both' },
];
const AVAILABILITY: { value: OnboardingProfile['availabilityStatus']; label: string }[] = [
  { value: 'available',   label: 'Open to Deals' },
  { value: 'busy',        label: 'Limited Availability' },
  { value: 'not_looking', label: 'Not Looking' },
];

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-1 focus:ring-nilink-accent/30';
const labelClass = 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <header className="mb-5">
        <h2
          className="text-xl font-black uppercase tracking-wide text-nilink-ink"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function ProfileEditor() {
  const { refreshUser } = useDashboard();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // Section state mirrors the OnboardingDraft sub-shapes so the same
  // persist helpers used by the wizard can be reused here verbatim.
  const [basics,     setBasics]     = useState<OnboardingBasics>(defaultDraft.basics);
  const [sports,     setSports]     = useState<SportEntry[]>([]);
  const [academic,   setAcademic]   = useState<OnboardingAcademic>(defaultDraft.academic);
  const [compliance, setCompliance] = useState<OnboardingCompliance>(defaultDraft.compliance);
  const [profile,    setProfile]    = useState<OnboardingProfile>(defaultDraft.profile);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const state = await loadOnboardingState();
      const draft = hydrateOnboardingDraft(state);
      setBasics(draft.basics);
      setSports(draft.athletic.sports);
      setAcademic(draft.academic);
      setCompliance(draft.compliance);
      setProfile(draft.profile);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* ── Section field updaters ── */
  const patchBasics     = (p: Partial<OnboardingBasics>)     => setBasics(b => ({ ...b, ...p }));
  const patchAcademic   = (p: Partial<OnboardingAcademic>)   => setAcademic(a => ({ ...a, ...p }));
  const patchCompliance = (p: Partial<OnboardingCompliance>) => setCompliance(c => ({ ...c, ...p }));
  const patchProfile    = (p: Partial<OnboardingProfile>)    => setProfile(pr => ({ ...pr, ...p }));
  const patchSocial = (key: keyof OnboardingProfile['socials'], value: string) =>
    setProfile(pr => ({ ...pr, socials: { ...pr.socials, [key]: value } }));

  const addSport = () =>
    setSports(s => [...s, { id: `${Date.now()}_${s.length}`, sport: '', position: '' }]);
  const updateSport = (id: string, patch: Partial<SportEntry>) =>
    setSports(s => s.map(row => row.id === id ? { ...row, ...patch } : row));
  const removeSport = (id: string) =>
    setSports(s => s.filter(row => row.id !== id));

  /* ── Photo upload: pick → crop → upload → refreshUser so the sidebar
        picks up the new avatar immediately. ── */
  const handlePickPhoto = () => fileInputRef.current?.click();
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setPendingFile(file);
  };
  const handleCropConfirm = async (cropped: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadAvatar(cropped);
      patchProfile({ profilePictureUrl: url });
      await refreshUser();
      setPendingFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  /* ── Save: commit each section in order, sync full_name to user_metadata ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await persistBasics(basics);
      await persistAthletic({ sports });
      await persistAcademic(academic);
      await persistCompliance(compliance);
      await persistProfileSection(profile);

      // Keep the shell's display name in sync (sessionUser.name comes
      // from auth user_metadata, not profiles.full_name).
      const trimmedName = basics.fullName.trim();
      if (trimmedName) {
        await authFetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName }),
        });
        await refreshUser();
      }

      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  /* ── Re-run onboarding: wipe local cache so wizard hydrates from DB ── */
  const handleReRunOnboarding = () => {
    try {
      localStorage.removeItem('athlete_onboarding_draft');
    } catch {
      /* localStorage unavailable — wizard will still load from DB */
    }
    router.push('/dashboard/onboarding');
  };

  const avatarSrc =
    profile.profilePictureUrl?.trim().length > 0
      ? profile.profilePictureUrl.trim()
      : userAvatarDataUrl(basics.fullName || 'Athlete');

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
            subtitle="Manage every field brands see when they discover you"
            className="min-w-0 flex-1"
          />
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReRunOnboarding}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-nilink-ink shadow-sm transition hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Re-run onboarding
            </button>
            <Link
              href="/dashboard/profile/view"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-nilink-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-nilink-accent-hover"
            >
              <Eye className="h-4 w-4" aria-hidden />
              View public profile
            </Link>
          </div>
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

        {/* ── Photo ── */}
        <SectionCard title="Profile photo">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm">
              <ImageWithFallback src={avatarSrc} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFilePicked}
                className="hidden"
              />
              <button
                type="button"
                onClick={handlePickPhoto}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-nilink-ink shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Uploading…</>
                ) : (
                  <><Upload className="h-4 w-4" aria-hidden /> {profile.profilePictureUrl ? 'Change photo' : 'Upload photo'}</>
                )}
              </button>
              {uploadError ? (
                <p className="text-xs font-medium text-amber-700">{uploadError}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP or GIF, up to 5 MB. Saved instantly to your profile.
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Basics ── */}
        <SectionCard title="Basic information">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="basics-name">Full name</label>
              <input
                id="basics-name" type="text" autoComplete="name" className={inputClass}
                value={basics.fullName}
                onChange={(e) => patchBasics({ fullName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="basics-alt-email">Alternate email</label>
              <input
                id="basics-alt-email" type="email" className={inputClass}
                value={basics.alternateEmail}
                onChange={(e) => patchBasics({ alternateEmail: e.target.value })}
                placeholder="backup@example.com"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="basics-phone">Phone</label>
              <input
                id="basics-phone" type="tel" className={inputClass}
                value={basics.phone}
                onChange={(e) => patchBasics({ phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="basics-pref">Preferred contact</label>
              <select
                id="basics-pref" className={inputClass}
                value={basics.contactPreference}
                onChange={(e) => patchBasics({ contactPreference: e.target.value as OnboardingBasics['contactPreference'] })}
              >
                <option value="">Select…</option>
                {CONTACT_PREFS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="basics-country">Country</label>
              <input
                id="basics-country" type="text" className={inputClass}
                value={basics.country}
                onChange={(e) => patchBasics({ country: e.target.value })}
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Athletic ── */}
        <SectionCard title="Sports" subtitle="The first sport listed is treated as your primary in brand search.">
          {sports.length === 0 && (
            <p className="mb-4 text-sm text-gray-500">No sports yet — add at least one to be discoverable.</p>
          )}
          <div className="space-y-3">
            {sports.map((row, idx) => (
              <div key={row.id} className="rounded-xl border border-gray-100 bg-gray-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {idx === 0 ? 'Primary sport' : `Sport ${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSport(row.id)}
                    className="rounded-md p-1 text-gray-400 transition hover:bg-white hover:text-red-500"
                    aria-label="Remove sport"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <select
                    className={inputClass}
                    value={row.sport}
                    onChange={(e) => updateSport(row.id, { sport: e.target.value })}
                  >
                    <option value="">Select sport</option>
                    {row.sport && !(SPORTS as readonly string[]).includes(row.sport) && (
                      <option value={row.sport}>{row.sport}</option>
                    )}
                    {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    type="text" className={inputClass}
                    value={row.position}
                    onChange={(e) => updateSport(row.id, { position: e.target.value })}
                    placeholder="Position (e.g. Point guard)"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addSport}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-nilink-ink transition hover:border-nilink-accent hover:bg-nilink-accent-soft"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add sport
          </button>
        </SectionCard>

        {/* ── Academic ── */}
        <SectionCard title="Academic" subtitle="School, year, and remaining eligibility.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="acad-school">School</label>
              <input
                id="acad-school" type="text" className={inputClass}
                value={academic.school}
                onChange={(e) => patchAcademic({ school: e.target.value })}
                placeholder="University of Whatever"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="acad-domain">School domain</label>
              <input
                id="acad-domain" type="text" className={inputClass}
                value={academic.schoolDomain}
                onChange={(e) => patchAcademic({ schoolDomain: e.target.value })}
                placeholder="unc.edu"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="acad-school-email">School email</label>
              <input
                id="acad-school-email" type="email" className={inputClass}
                value={academic.schoolEmail}
                onChange={(e) => patchAcademic({ schoolEmail: e.target.value })}
                placeholder="you@unc.edu"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="acad-year">Current year</label>
              <select
                id="acad-year" className={inputClass}
                value={academic.currentYear}
                onChange={(e) => patchAcademic({ currentYear: e.target.value })}
              >
                <option value="">Select year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="acad-elig-status">Eligibility status</label>
              <select
                id="acad-elig-status" className={inputClass}
                value={academic.eligibilityStatus}
                onChange={(e) => patchAcademic({ eligibilityStatus: e.target.value })}
              >
                <option value="">Select status</option>
                {ELIGIBILITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="acad-elig-years">Eligibility years remaining</label>
              <input
                id="acad-elig-years" type="number" min={0} max={6} className={inputClass}
                value={academic.eligibilityYears}
                onChange={(e) => patchAcademic({ eligibilityYears: e.target.value })}
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Compliance ── */}
        <SectionCard title="NIL compliance" subtitle="School verification and disclosure flags required by your athletic compliance office.">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={compliance.schoolEmailVerified}
                  onChange={(e) => patchCompliance({ schoolEmailVerified: e.target.checked })}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-nilink-ink">
                    <BadgeCheck className="h-4 w-4 text-nilink-accent" aria-hidden />
                    School email verified
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">Confirms ownership of your .edu address.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={compliance.idVerified}
                  onChange={(e) => patchCompliance({ idVerified: e.target.checked })}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-nilink-ink">
                    <ShieldCheck className="h-4 w-4 text-nilink-accent" aria-hidden />
                    Identity verified
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">Government ID verification on file.</span>
                </span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="comp-aco-email">Athletic Compliance Office (ACO) email</label>
                <input
                  id="comp-aco-email" type="email" className={inputClass}
                  value={compliance.acoEmail}
                  onChange={(e) => patchCompliance({ acoEmail: e.target.value })}
                  placeholder="compliance@school.edu"
                />
              </div>
              <div>
                <label className={labelClass}>NIL disclosure required by your school?</label>
                <div className="flex gap-2">
                  {(['yes', 'no'] as const).map((v) => {
                    const on = compliance.nilDisclosureRequired === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => patchCompliance({ nilDisclosureRequired: v })}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition ${
                          on
                            ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Profile (bio + banner + availability) ── */}
        <SectionCard title="Public profile">
          <div className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="prof-bio">Bio</label>
              <textarea
                id="prof-bio" rows={4} className={`${inputClass} resize-none`}
                value={profile.bio}
                onChange={(e) => patchProfile({ bio: e.target.value })}
                placeholder="Tell brands what makes you unique…"
              />
              <p className="mt-1 text-right text-[10px] text-gray-400">{profile.bio.length} / 500</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="prof-banner">Banner image URL</label>
              <input
                id="prof-banner" type="url" className={inputClass}
                value={profile.profileBannerUrl}
                onChange={(e) => patchProfile({ profileBannerUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className={labelClass}>Availability</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {AVAILABILITY.map((opt) => {
                  const on = profile.availabilityStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patchProfile({ availabilityStatus: opt.value })}
                      className={`rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
                        on
                          ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Socials ── */}
        <SectionCard title="Social media">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={`${labelClass} flex items-center gap-2`}>
                <Instagram className="h-3.5 w-3.5 text-pink-500" aria-hidden /> Instagram
              </label>
              <input
                type="text" className={inputClass}
                value={profile.socials.instagram}
                onChange={(e) => patchSocial('instagram', e.target.value)}
                placeholder="@handle"
              />
            </div>
            <div>
              <label className={labelClass}>TikTok</label>
              <input
                type="text" className={inputClass}
                value={profile.socials.tiktok}
                onChange={(e) => patchSocial('tiktok', e.target.value)}
                placeholder="@handle"
              />
            </div>
            <div>
              <label className={`${labelClass} flex items-center gap-2`}>
                <Twitter className="h-3.5 w-3.5 text-sky-500" aria-hidden /> X (Twitter)
              </label>
              <input
                type="text" className={inputClass}
                value={profile.socials.twitter}
                onChange={(e) => patchSocial('twitter', e.target.value)}
                placeholder="@handle"
              />
            </div>
            <div>
              <label className={labelClass}>Other</label>
              <input
                type="text" className={inputClass}
                value={profile.socials.other}
                onChange={(e) => patchSocial('other', e.target.value)}
                placeholder="YouTube, Snapchat, etc."
              />
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Save profile
          </button>
        </div>
      </div>

      {pendingFile && (
        <PhotoCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
