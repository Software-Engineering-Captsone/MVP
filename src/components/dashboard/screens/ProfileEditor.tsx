'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Save, Eye, Loader2,
  Plus, X, ShieldCheck, BadgeCheck, ImagePlus, AlertCircle, Camera, Pencil,
  Award, LinkIcon, Trash2, Video,
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import dynamic from 'next/dynamic';

const PhotoCropModal = dynamic(
  () => import('@/components/ui/PhotoCropModal').then((m) => m.PhotoCropModal),
  { ssr: false, loading: () => null }
);
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/authFetch';
import { uploadAvatar } from '@/lib/avatarUpload';
import { uploadBanner } from '@/lib/bannerUpload';
import { loadOnboardingState, hydrateOnboardingDraft } from '@/lib/onboardingHydrate';
import {
  createAchievementDraft,
  createContentDraft,
  createProfileDetailsDraft,
  loadAthleteProfileDetails,
  saveAthleteProfileDetails,
  type AthleteContentDraft,
  type AthleteContentDraftType,
  type AthleteProfileDetailsDraft,
} from '@/lib/athleteProfileDetails';
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

/* ── Platform icons ── */
const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);
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
const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-1 focus:ring-nilink-accent/30';
const labelClass = 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

function followerValue(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

function yearValue(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

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
  const [profileDetails, setProfileDetails] =
    useState<AthleteProfileDetailsDraft>(() => createProfileDetailsDraft());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bioEditableRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [verifyCodeSent, setVerifyCodeSent] = useState(false);
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyInfo, setVerifyInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const state = await loadOnboardingState();
      const draft = hydrateOnboardingDraft(state);
      const details = await loadAthleteProfileDetails();

      // One-time migration: if DB has no name yet, the user completed onboarding
      // before per-step DB sync was added (steps 1-4 were only in localStorage).
      // Flush localStorage → DB now, then reload.
      if (!draft.basics.fullName && typeof window !== 'undefined') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const local = JSON.parse(localStorage.getItem('athlete_onboarding_draft') ?? 'null') as any;
          if (local?.completedAt && local?.basics?.fullName) {
            await persistBasics({ ...defaultDraft.basics, ...local.basics });
            const sports = Array.isArray(local?.athletic?.sports) ? local.athletic.sports : [];
            if (sports.length) await persistAthletic({ sports });
            if (local?.academic) await persistAcademic({ ...defaultDraft.academic, ...local.academic });
            if (local?.compliance) await persistCompliance({ ...defaultDraft.compliance, ...local.compliance });
            if (local?.profile) {
              await persistProfileSection({
                ...defaultDraft.profile,
                ...local.profile,
                socials: { ...defaultDraft.profile.socials, ...(local.profile.socials ?? {}) },
              });
            }
            // Reload from DB after migration so state is authoritative
            const migrated = await loadOnboardingState();
            const migratedDraft = hydrateOnboardingDraft(migrated);
            setBasics(migratedDraft.basics);
            setSports(migratedDraft.athletic.sports);
            setAcademic(migratedDraft.academic);
            setCompliance(migratedDraft.compliance);
            setProfile(migratedDraft.profile);
            setProfileDetails(await loadAthleteProfileDetails());
            return;
          }
        } catch { /* silent — show whatever DB has */ }
      }

      setBasics(draft.basics);
      setSports(draft.athletic.sports);
      setAcademic(draft.academic);
      setCompliance(draft.compliance);
      setProfile(draft.profile);
      setProfileDetails(details);
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
  const patchProfileDetails = (p: Partial<AthleteProfileDetailsDraft>) =>
    setProfileDetails((d) => ({ ...d, ...p }));
  const patchSocial = (key: keyof OnboardingProfile['socials'], value: string) =>
    setProfile(pr => ({ ...pr, socials: { ...pr.socials, [key]: value } }));

  const normalizedSchoolEmail = useMemo(
    () => academic.schoolEmail.trim().toLowerCase(),
    [academic.schoolEmail]
  );

  const hasValidSchoolEmail = useMemo(() => {
    if (!normalizedSchoolEmail) return false;
    const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailPattern.test(normalizedSchoolEmail)) return false;
    if (!normalizedSchoolEmail.endsWith('.edu')) return false;
    const domain = academic.schoolDomain.trim().toLowerCase();
    return domain ? normalizedSchoolEmail.endsWith(`@${domain}`) : true;
  }, [normalizedSchoolEmail, academic.schoolDomain]);

  const addSport = () =>
    setSports(s => [...s, { id: `${Date.now()}_${s.length}`, sport: '', position: '' }]);
  const updateSport = (id: string, patch: Partial<SportEntry>) =>
    setSports(s => s.map(row => row.id === id ? { ...row, ...patch } : row));
  const removeSport = (id: string) =>
    setSports(s => s.filter(row => row.id !== id));

  const addAchievement = () =>
    setProfileDetails((d) => ({ ...d, achievements: [...d.achievements, createAchievementDraft()] }));
  const updateAchievement = (
    id: string,
    patch: Partial<AthleteProfileDetailsDraft['achievements'][number]>,
  ) =>
    setProfileDetails((d) => ({
      ...d,
      achievements: d.achievements.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const removeAchievement = (id: string) =>
    setProfileDetails((d) => ({ ...d, achievements: d.achievements.filter((item) => item.id !== id) }));

  const addContentItem = (type: AthleteContentDraftType = 'image') =>
    setProfileDetails((d) => ({ ...d, contentItems: [...d.contentItems, createContentDraft(type)] }));
  const updateContentItem = (id: string, patch: Partial<AthleteContentDraft>) =>
    setProfileDetails((d) => ({
      ...d,
      contentItems: d.contentItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const removeContentItem = (id: string) =>
    setProfileDetails((d) => ({ ...d, contentItems: d.contentItems.filter((item) => item.id !== id) }));

  /* ── Photo upload: pick → crop → upload → refreshUser so the sidebar
        picks up the new avatar immediately. ── */
  const handlePickPhoto = () => fileInputRef.current?.click();
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setUploadError('Image must be under 5 MB.');
      return;
    }
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

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerError(null);
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      setBannerError('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setBannerError('Image must be under 5 MB.');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }
    setBannerUploading(true);
    try {
      const url = await uploadBanner(file);
      patchProfile({ profileBannerUrl: url });
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!isEditingBio || !bioEditableRef.current) return;
    const el = bioEditableRef.current;
    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [isEditingBio]);

  useEffect(() => {
    if (!compliance.schoolEmailVerified) return;
    setVerifyCodeSent(false);
    setVerifyCodeInput('');
    setVerifyError(null);
  }, [compliance.schoolEmailVerified]);

  const sendSchoolVerificationCode = async () => {
    if (!hasValidSchoolEmail) {
      setVerifyError('Add a valid .edu school email in Academic first.');
      return;
    }
    setVerifyError(null);
    setVerifyInfo(null);
    setVerifySending(true);
    try {
      const res = await fetch('/api/verify/school-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedSchoolEmail }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setVerifyError(json.error ?? 'Failed to send verification code');
        return;
      }
      setVerifyCodeSent(true);
      setVerifyCodeInput('');
      setVerifyInfo(`Code sent to ${normalizedSchoolEmail}`);
    } catch {
      setVerifyError('Network error while sending code');
    } finally {
      setVerifySending(false);
    }
  };

  const confirmSchoolVerificationCode = async () => {
    if (verifyCodeInput.length !== 6) {
      setVerifyError('Enter the 6-digit code.');
      return;
    }
    setVerifyError(null);
    setVerifySubmitting(true);
    try {
      const res = await fetch('/api/verify/school-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedSchoolEmail, code: verifyCodeInput }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setVerifyError(json.error ?? 'Verification failed');
        return;
      }
      patchCompliance({ schoolEmailVerified: true });
      setVerifyInfo('School email verified.');
      setVerifyCodeSent(false);
      setVerifyCodeInput('');
    } catch {
      setVerifyError('Network error while verifying code');
    } finally {
      setVerifySubmitting(false);
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
      await saveAthleteProfileDetails(profileDetails);

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



  const avatarSrc =
    profile.profilePictureUrl?.trim().length > 0
      ? profile.profilePictureUrl.trim()
      : userAvatarDataUrl(basics.fullName || 'Athlete');

  if (loading) {
    return (
      <div className="flex min-h-full flex-col bg-nilink-page font-sans text-nilink-ink">
        <div className="animate-pulse shrink-0 border-b border-gray-100 bg-white py-8 dash-main-gutter-x">
          <div className="h-8 w-40 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
        </div>
        <div className="animate-pulse flex-1 space-y-6 py-8 dash-main-gutter-x md:py-10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="h-5 w-36 rounded bg-gray-200" />
              <div className="mt-4 space-y-3">
                <div className="h-10 rounded-lg bg-gray-100" />
                <div className="h-10 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
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

        {/* ── Profile header (banner + avatar + bio) ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Banner + avatar overlap */}
          <div className="relative">
            {/* Banner */}
            <div
              className="group relative h-36 w-full cursor-pointer overflow-hidden bg-gradient-to-br from-nilink-accent-soft to-gray-100 sm:h-44"
              onClick={() => bannerInputRef.current?.click()}
            >
              {profile.profileBannerUrl ? (
                <ImageWithFallback
                  src={profile.profileBannerUrl}
                  alt="Banner"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1.5 text-gray-300">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs font-medium">Add a banner photo</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                  <Camera className="h-3.5 w-3.5" /> Edit banner
                </span>
              </div>
              {bannerUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Loader2 className="h-6 w-6 animate-spin text-nilink-accent" />
                </div>
              )}
            </div>

            {/* Avatar overlapping banner bottom */}
            <div className="absolute -bottom-10 left-5">
              <div className="relative h-20 w-20">
                <div
                  className="h-20 w-20 cursor-pointer overflow-hidden rounded-full border-4 border-white bg-white shadow-md"
                  onClick={handlePickPhoto}
                >
                  {uploading ? (
                    <div className="flex h-full items-center justify-center bg-gray-50">
                      <Loader2 className="h-5 w-5 animate-spin text-nilink-accent" />
                    </div>
                  ) : (
                    <ImageWithFallback src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handlePickPhoto}
                  className="absolute bottom-0.5 right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-nilink-accent text-white ring-2 ring-white shadow-sm transition hover:bg-nilink-accent-hover"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Content below */}
          <div className="px-6 pt-12 pb-5">
            {(uploadError || bannerError) && (
              <div className="mb-3 space-y-1">
                {uploadError && (
                  <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {uploadError}</p>
                )}
                {bannerError && (
                  <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {bannerError}</p>
                )}
              </div>
            )}
            <p
              className="text-[30px] font-bold uppercase tracking-[0.02em] text-nilink-ink"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {basics.fullName || <span className="text-base font-normal normal-case tracking-normal text-gray-400">Your name — edit below in Basic information</span>}
            </p>
            <div className="mt-3">
              <div className="flex items-start gap-2">
                <div
                  ref={bioEditableRef}
                  role="textbox"
                  aria-label="Bio"
                  aria-multiline="true"
                  contentEditable={isEditingBio}
                  suppressContentEditableWarning
                  onInput={(e) => patchProfile({ bio: (e.currentTarget.textContent ?? '').slice(0, 500) })}
                  onBlur={(e) => {
                    patchProfile({ bio: (e.currentTarget.textContent ?? '').trim() });
                    setIsEditingBio(false);
                  }}
                  className={`min-h-[28px] flex-1 text-[15px] leading-relaxed outline-none transition ${
                    isEditingBio
                      ? 'rounded-lg border border-nilink-accent-border bg-white px-3 py-2 text-nilink-ink ring-1 ring-nilink-accent/20'
                      : 'rounded-none border border-transparent bg-transparent px-0 py-0.5 text-gray-700'
                  }`}
                >
                  {profile.bio.trim() || 'Tell brands what makes you unique…'}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingBio((prev) => !prev)}
                  aria-label={isEditingBio ? 'Stop editing bio' : 'Edit bio'}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition hover:border-gray-200 hover:bg-white hover:text-nilink-ink"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              {isEditingBio ? (
                <p className="mt-1 text-right text-[10px] font-medium text-gray-400">{profile.bio.length} / 500</p>
              ) : null}
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFilePicked} />
          <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleBannerChange} />
        </div>

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
            <div>
              <label className={labelClass} htmlFor="basics-hometown">Hometown</label>
              <input
                id="basics-hometown"
                type="text"
                className={inputClass}
                value={profileDetails.hometown}
                onChange={(e) => patchProfileDetails({ hometown: e.target.value })}
                placeholder="Caldwell, NJ"
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
              <label className={labelClass} htmlFor="acad-major">Major</label>
              <input
                id="acad-major"
                type="text"
                className={inputClass}
                value={profileDetails.major}
                onChange={(e) => patchProfileDetails({ major: e.target.value })}
                placeholder="Marketing"
              />
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

        {/* ── Achievements ── */}
        <SectionCard title="Achievements" subtitle="Add honors, awards, milestones, and team leadership brands should see.">
          {profileDetails.achievements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-5 text-sm text-gray-500">
              No achievements yet. Add the strongest proof points from your athletic or academic career.
            </div>
          ) : (
            <div className="space-y-3">
              {profileDetails.achievements.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-nilink-accent" aria-hidden />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Achievement {idx + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAchievement(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-red-500"
                      aria-label="Remove achievement"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px]">
                    <div>
                      <label className={labelClass} htmlFor={`achievement-title-${item.id}`}>Title</label>
                      <input
                        id={`achievement-title-${item.id}`}
                        type="text"
                        className={inputClass}
                        value={item.title}
                        onChange={(e) => updateAchievement(item.id, { title: e.target.value })}
                        placeholder="All-Conference First Team"
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`achievement-year-${item.id}`}>Year</label>
                      <input
                        id={`achievement-year-${item.id}`}
                        inputMode="numeric"
                        className={inputClass}
                        value={item.year}
                        onChange={(e) => updateAchievement(item.id, { year: yearValue(e.target.value) })}
                        placeholder="2025"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addAchievement}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-nilink-ink transition hover:border-nilink-accent hover:bg-nilink-accent-soft"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add achievement
          </button>
        </SectionCard>

        {/* ── Verification ── */}
        <SectionCard title="Verification">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              className={`rounded-xl border bg-white px-4 py-3 transition ${
                compliance.schoolEmailVerified
                  ? 'border-gray-200'
                  : hasValidSchoolEmail
                    ? 'border-nilink-accent-border/70 hover:border-nilink-accent-border'
                    : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-md bg-nilink-accent-soft p-1.5 text-nilink-accent">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-nilink-ink">School email</p>
                  <p className="mt-0.5 text-xs text-gray-500">Ownership of your .edu address.</p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      compliance.schoolEmailVerified
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {compliance.schoolEmailVerified ? 'Verified' : 'Not verified'}
                  </span>

                  {!compliance.schoolEmailVerified ? (
                    <div className="mt-2.5 space-y-2">
                      {verifyCodeSent ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={verifyCodeInput}
                            onChange={(e) =>
                              setVerifyCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                            }
                            placeholder="6-digit code"
                            className="h-9 w-[122px] rounded-lg border border-gray-200 px-2.5 text-xs tracking-[0.15em] text-gray-700 outline-none transition focus:border-nilink-accent-border focus:ring-1 focus:ring-nilink-accent/30"
                            disabled={verifySubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => void confirmSchoolVerificationCode()}
                            disabled={verifySubmitting || verifyCodeInput.length !== 6}
                            className="inline-flex h-9 items-center rounded-lg bg-nilink-accent px-3 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {verifySubmitting ? 'Verifying…' : 'Verify'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void sendSchoolVerificationCode()}
                          disabled={verifySending || !hasValidSchoolEmail}
                          className="inline-flex h-9 items-center rounded-lg bg-nilink-accent px-3 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {verifySending ? 'Sending…' : 'Verify now'}
                        </button>
                      )}

                      {!hasValidSchoolEmail ? (
                        <p className="text-[11px] text-amber-700">
                          Add a valid .edu school email in Academic to verify.
                        </p>
                      ) : null}
                      {verifyError ? <p className="text-[11px] text-red-600">{verifyError}</p> : null}
                      {verifyInfo ? <p className="text-[11px] text-gray-500">{verifyInfo}</p> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-md bg-gray-200 p-1.5 text-gray-500">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">Identity</p>
                  <p className="mt-0.5 text-xs text-gray-500">Government ID check.</p>
                  <span className="mt-2 inline-flex rounded-full bg-gray-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700">
                    Unavailable
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── NIL Compliance ── */}
        <SectionCard title="NIL compliance" subtitle="School disclosure fields used for your Athletic Compliance Office workflow.">
          <div className="space-y-5">
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

        {/* ── Availability ── */}
        <SectionCard title="Availability">
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
        </SectionCard>

        {/* ── Socials ── */}
        <SectionCard title="Social media" subtitle="Add your Instagram and TikTok reach so brands can evaluate NIL fit.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <InstagramIcon className="h-4 w-4 text-pink-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Instagram</span>
              </div>
              <label className={labelClass} htmlFor="profile-instagram">
                Handle
              </label>
              <input
                id="profile-instagram"
                value={profile.socials.instagram}
                onChange={(e) => patchSocial('instagram', e.target.value)}
                className={inputClass}
                placeholder="@yourhandle"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <label className={`${labelClass} mt-3`} htmlFor="profile-instagram-followers">
                Followers
              </label>
              <input
                id="profile-instagram-followers"
                inputMode="numeric"
                value={profile.socials.instagramFollowers}
                onChange={(e) => patchSocial('instagramFollowers', followerValue(e.target.value))}
                className={inputClass}
                placeholder="12500"
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <TiktokIcon className="h-4 w-4 text-nilink-ink" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">TikTok</span>
              </div>
              <label className={labelClass} htmlFor="profile-tiktok">
                Handle
              </label>
              <input
                id="profile-tiktok"
                value={profile.socials.tiktok}
                onChange={(e) => patchSocial('tiktok', e.target.value)}
                className={inputClass}
                placeholder="@yourhandle"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <label className={`${labelClass} mt-3`} htmlFor="profile-tiktok-followers">
                Followers
              </label>
              <input
                id="profile-tiktok-followers"
                inputMode="numeric"
                value={profile.socials.tiktokFollowers}
                onChange={(e) => patchSocial('tiktokFollowers', followerValue(e.target.value))}
                className={inputClass}
                placeholder="48000"
              />
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            These launch metrics are self-reported. OAuth verification can be layered back in after platform review.
          </p>
        </SectionCard>

        {/* ── Content portfolio ── */}
        <SectionCard title="Content portfolio" subtitle="Curate posts, reels, clips, or photos that brands should review before sending an offer.">
          {profileDetails.contentItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-5 text-sm text-gray-500">
              No content added yet. Add media URLs for your strongest brand-safe posts or highlight clips.
            </div>
          ) : (
            <div className="space-y-4">
              {profileDetails.contentItems.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {item.type === 'video' ? (
                        <Video className="h-4 w-4 text-nilink-accent" aria-hidden />
                      ) : (
                        <ImagePlus className="h-4 w-4 text-nilink-accent" aria-hidden />
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Portfolio item {idx + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none focus:border-nilink-accent-border focus:ring-1 focus:ring-nilink-accent/30"
                        value={item.type}
                        onChange={(e) =>
                          updateContentItem(item.id, { type: e.target.value as AthleteContentDraftType })
                        }
                        aria-label="Content type"
                      >
                        <option value="image">Photo</option>
                        <option value="video">Video</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeContentItem(item.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-red-500"
                        aria-label="Remove content item"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={labelClass} htmlFor={`content-media-${item.id}`}>
                        Media URL
                      </label>
                      <div className="relative">
                        <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                        <input
                          id={`content-media-${item.id}`}
                          type="url"
                          className={`${inputClass} pl-9`}
                          value={item.mediaUrl}
                          onChange={(e) => updateContentItem(item.id, { mediaUrl: e.target.value })}
                          placeholder="https://..."
                          autoCapitalize="none"
                          autoCorrect="off"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass} htmlFor={`content-thumb-${item.id}`}>
                        Thumbnail URL
                      </label>
                      <input
                        id={`content-thumb-${item.id}`}
                        type="url"
                        className={inputClass}
                        value={item.thumbnailUrl}
                        onChange={(e) => updateContentItem(item.id, { thumbnailUrl: e.target.value })}
                        placeholder={item.type === 'video' ? 'Recommended for videos' : 'Defaults to media URL if blank'}
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass} htmlFor={`content-caption-${item.id}`}>Caption</label>
                      <input
                        id={`content-caption-${item.id}`}
                        type="text"
                        className={inputClass}
                        value={item.caption}
                        onChange={(e) => updateContentItem(item.id, { caption: e.target.value })}
                        placeholder="Game-day fit check, training clip, product post..."
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`content-overlay-${item.id}`}>Overlay text</label>
                      <input
                        id={`content-overlay-${item.id}`}
                        type="text"
                        className={inputClass}
                        value={item.overlayText}
                        onChange={(e) => updateContentItem(item.id, { overlayText: e.target.value })}
                        placeholder="Optional short label"
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`content-date-${item.id}`}>Posted date</label>
                      <input
                        id={`content-date-${item.id}`}
                        type="date"
                        className={inputClass}
                        value={item.postedAt}
                        onChange={(e) => updateContentItem(item.id, { postedAt: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`content-views-${item.id}`}>Views</label>
                      <input
                        id={`content-views-${item.id}`}
                        inputMode="numeric"
                        className={inputClass}
                        value={item.views}
                        onChange={(e) => updateContentItem(item.id, { views: followerValue(e.target.value) })}
                        placeholder="12000"
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`content-likes-${item.id}`}>Likes</label>
                      <input
                        id={`content-likes-${item.id}`}
                        inputMode="numeric"
                        className={inputClass}
                        value={item.likes}
                        onChange={(e) => updateContentItem(item.id, { likes: followerValue(e.target.value) })}
                        placeholder="900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addContentItem('image')}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-nilink-ink transition hover:border-nilink-accent hover:bg-nilink-accent-soft"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              Add photo
            </button>
            <button
              type="button"
              onClick={() => addContentItem('video')}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-nilink-ink transition hover:border-nilink-accent hover:bg-nilink-accent-soft"
            >
              <Video className="h-4 w-4" aria-hidden />
              Add video
            </button>
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
