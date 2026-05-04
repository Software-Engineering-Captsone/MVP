'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Save, Eye, Loader2, Upload, Building2, MapPin, DollarSign, User,
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
import { userAvatarDataUrl } from '@/lib/userAvatar';
import {
  loadBrandOnboardingState,
  hydrateBrandDraft,
  defaultBrandDraft,
  type BrandOnboardingDraft,
} from '@/lib/brandOnboardingHydrate';
import {
  persistBrandCompanyInfo,
  markBrandOnboardingComplete,
  type BrandCompanyInfo,
  type BrandProfileBasics,
} from '@/lib/brandOnboardingPersist';

/* ── Option lists ─────────────────────────────────────────────── */
const INDUSTRIES = [
  'Sports Nutrition', 'Apparel', 'Fitness Tech', 'Beverages',
  'Footwear', 'Fitness Equipment', 'Other',
] as const;

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;

const BUDGET_TIERS: { value: string; label: string }[] = [
  { value: 'micro',      label: 'Micro ($0–$1K)' },
  { value: 'small',      label: 'Small ($1K–$5K)' },
  { value: 'mid',        label: 'Mid ($5K–$25K)' },
  { value: 'large',      label: 'Large ($25K–$100K)' },
  { value: 'enterprise', label: 'Enterprise ($100K+)' },
];

const CONTACT_PREFS: { value: BrandProfileBasics['contactPreference']; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'both',  label: 'Both' },
];

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-1 focus:ring-nilink-accent/30';
const labelClass = 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

function SectionCard({
  title, subtitle, icon: Icon, children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <header className="mb-5 flex items-start gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-nilink-accent-soft text-nilink-accent">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2
            className="text-xl font-black uppercase tracking-wide text-nilink-ink"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

export function BusinessProfile() {
  const { refreshUser } = useDashboard();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [draft, setDraft] = useState<BrandOnboardingDraft>(defaultBrandDraft());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const state = await loadBrandOnboardingState();
      setDraft(hydrateBrandDraft(state));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* ── Field updaters ── */
  const patchBasics  = (p: Partial<BrandProfileBasics>) =>
    setDraft(d => ({ ...d, basics: { ...d.basics, ...p } }));
  const patchCompany = (p: Partial<BrandCompanyInfo>) =>
    setDraft(d => ({ ...d, company: { ...d.company, ...p } }));
  const patchTopLevel = (p: Partial<Pick<BrandOnboardingDraft, 'bio' | 'bannerUrl' | 'avatarUrl'>>) =>
    setDraft(d => ({ ...d, ...p }));

  /* ── Photo upload (Storage + profiles.avatar_url) ── */
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
      patchTopLevel({ avatarUrl: url });
      await refreshUser();
      setPendingFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await persistBrandCompanyInfo(draft.basics, draft.company);

      // Shell display name comes from auth.user_metadata, not profiles —
      // keep the two in sync when the brand edits their primary contact.
      const trimmedName = draft.basics.fullName.trim();
      if (trimmedName) {
        await authFetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName }),
        });
      }

      // Until the brand onboarding wizard (Option B) exists, the first
      // successful save from this editor is how a brand finishes
      // onboarding. Safe to call repeatedly — the RPC is idempotent.
      if (!draft.completedAt) {
        const ts = await markBrandOnboardingComplete();
        setDraft(d => ({ ...d, completedAt: ts }));
      }

      await refreshUser();
      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc =
    draft.avatarUrl?.trim().length > 0
      ? draft.avatarUrl.trim()
      : userAvatarDataUrl(draft.company.companyName || draft.basics.fullName || 'Brand');

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
            title="Business profile"
            subtitle="How athletes see your brand on NILINK"
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

        {/* ── Logo ── */}
        <SectionCard title="Brand logo" icon={Building2}>
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
                  <><Upload className="h-4 w-4" aria-hidden /> {draft.avatarUrl ? 'Change logo' : 'Upload logo'}</>
                )}
              </button>
              {uploadError ? (
                <p className="text-xs font-medium text-amber-700">{uploadError}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP or GIF, up to 5 MB. Saved instantly.
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Company details ── */}
        <SectionCard title="Company" icon={Building2}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="co-name">Company name</label>
              <input
                id="co-name" type="text" className={inputClass}
                value={draft.company.companyName}
                onChange={(e) => patchCompany({ companyName: e.target.value })}
                placeholder="Your brand"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="co-industry">Industry</label>
              <select
                id="co-industry" className={inputClass}
                value={draft.company.industry}
                onChange={(e) => patchCompany({ industry: e.target.value })}
              >
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="co-size">Company size</label>
              <select
                id="co-size" className={inputClass}
                value={draft.company.companySize}
                onChange={(e) => patchCompany({ companySize: e.target.value })}
              >
                <option value="">Select…</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="co-website">Website</label>
              <input
                id="co-website" type="text" className={inputClass}
                value={draft.company.website}
                onChange={(e) => patchCompany({ website: e.target.value })}
                placeholder="example.com"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="co-founded">Founded</label>
              <input
                id="co-founded" type="number" min={1800} max={2100} className={inputClass}
                value={draft.company.foundedYear}
                onChange={(e) => patchCompany({ foundedYear: e.target.value })}
                placeholder="2018"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="co-tagline">Tagline</label>
              <input
                id="co-tagline" type="text" className={inputClass}
                value={draft.company.tagline}
                onChange={(e) => patchCompany({ tagline: e.target.value })}
                placeholder="Short one-liner"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="co-about">About</label>
              <textarea
                id="co-about" rows={4} className={`${inputClass} resize-none`}
                value={draft.company.about}
                onChange={(e) => patchCompany({ about: e.target.value })}
                placeholder="What your brand stands for — longer-form."
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Headquarters ── */}
        <SectionCard title="Headquarters" icon={MapPin}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="hq-country">Country</label>
              <input
                id="hq-country" type="text" className={inputClass}
                value={draft.company.hqCountry}
                onChange={(e) => patchCompany({ hqCountry: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="hq-state">State</label>
              <input
                id="hq-state" type="text" className={inputClass}
                value={draft.company.hqState}
                onChange={(e) => patchCompany({ hqState: e.target.value })}
                placeholder="TX"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="hq-city">City</label>
              <input
                id="hq-city" type="text" className={inputClass}
                value={draft.company.hqCity}
                onChange={(e) => patchCompany({ hqCity: e.target.value })}
                placeholder="Austin"
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Budget posture ── */}
        <SectionCard
          title="Deal posture"
          subtitle="Helps athletes gauge fit before reaching out."
          icon={DollarSign}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="bp-tier">Typical deal size</label>
              <select
                id="bp-tier" className={inputClass}
                value={draft.company.budgetTier}
                onChange={(e) => patchCompany({ budgetTier: e.target.value })}
              >
                <option value="">Select…</option>
                {BUDGET_TIERS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="bp-range">Deal range (human-facing)</label>
              <input
                id="bp-range" type="text" className={inputClass}
                value={draft.company.typicalDealRange}
                onChange={(e) => patchCompany({ typicalDealRange: e.target.value })}
                placeholder="$500 – $5,000"
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Primary contact ── */}
        <SectionCard title="Primary contact" icon={User}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="pc-name">Name</label>
              <input
                id="pc-name" type="text" className={inputClass}
                value={draft.basics.fullName}
                onChange={(e) => patchBasics({ fullName: e.target.value })}
                placeholder="Full name"
                autoComplete="name"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pc-role">Role / title</label>
              <input
                id="pc-role" type="text" className={inputClass}
                value={draft.company.primaryContactRole}
                onChange={(e) => patchCompany({ primaryContactRole: e.target.value })}
                placeholder="Head of Partnerships"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pc-phone">Phone</label>
              <input
                id="pc-phone" type="tel" className={inputClass}
                value={draft.basics.phone}
                onChange={(e) => patchBasics({ phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pc-pref">Preferred contact</label>
              <select
                id="pc-pref" className={inputClass}
                value={draft.basics.contactPreference}
                onChange={(e) =>
                  patchBasics({
                    contactPreference: e.target.value as BrandProfileBasics['contactPreference'],
                  })
                }
              >
                <option value="">Select…</option>
                {CONTACT_PREFS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
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
