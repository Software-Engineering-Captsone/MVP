'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  UserCircle2,
  ImagePlus,
  X,
} from 'lucide-react';
import type { OnboardingProfile } from '@/hooks/useOnboardingStorage';
import { uploadAvatar } from '@/lib/avatarUpload';
import { uploadBanner } from '@/lib/bannerUpload';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

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

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

/* ── Types ── */
interface ConnectedPlatform {
  platform: string;
  handle: string;
  followerCount: number;
}

const PLATFORMS: { id: string; label: string; Icon: React.FC<{ className?: string }>; color: string; comingSoon?: boolean }[] = [
  { id: 'youtube',   label: 'YouTube',   Icon: YouTubeIcon,   color: 'text-red-500' },
  { id: 'instagram', label: 'Instagram', Icon: InstagramIcon, color: 'text-pink-500', comingSoon: true },
  { id: 'tiktok',    label: 'TikTok',    Icon: TiktokIcon,    color: 'text-nilink-ink', comingSoon: true },
];

const AVAILABILITY: { value: NonNullable<OnboardingProfile['availabilityStatus']>; label: string; color: string }[] = [
  { value: 'available',   label: 'Open to Deals',        color: 'emerald' },
  { value: 'busy',        label: 'Limited Availability', color: 'amber' },
  { value: 'not_looking', label: 'Not Looking',          color: 'gray' },
];

interface Step4Props {
  data: OnboardingProfile;
  userId: string;
  onChange: (patch: Partial<OnboardingProfile>) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function Step4Profile({ data, userId: _userId, onChange, onBack, onComplete }: Step4Props) {
  /* ── Upload states ── */
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  /* ── Social connection states ── */
  const [connected, setConnected] = useState<ConnectedPlatform[]>([]);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  /* ── Load connected platforms on mount + after OAuth return ── */
  useEffect(() => {
    const fetchConnected = async () => {
      try {
        const res = await fetch('/api/social/tokens');
        if (!res.ok) return;
        const json = await res.json() as { platforms?: ConnectedPlatform[] };
        setConnected(json.platforms ?? []);
      } catch { /* non-fatal */ }
    };

    fetchConnected();

    // If returning from OAuth callback, refresh connection status
    const params = new URLSearchParams(window.location.search);
    const connectedPlatform = params.get('connected');
    const oauthError = params.get('error');
    if (connectedPlatform || oauthError) {
      // Clean up URL params without navigating
      const url = new URL(window.location.href);
      url.searchParams.delete('connected');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
      if (oauthError) setConnectError(`Connection failed. Please try again.`);
    }
  }, []);

  /* ── Avatar upload ── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(file);
      onChange({ profilePictureUrl: url });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  /* ── Banner upload ── */
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerError(null);
    setBannerUploading(true);
    try {
      const url = await uploadBanner(file);
      onChange({ profileBannerUrl: url });
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  /* ── Disconnect platform ── */
  const handleDisconnect = async (platform: string) => {
    setDisconnecting(platform);
    try {
      await fetch(`/api/social/tokens/${platform}`, { method: 'DELETE' });
      setConnected((prev) => prev.filter((p) => p.platform !== platform));
      onChange({ socials: { ...data.socials, [platform]: '' } });
    } catch { /* non-fatal */ }
    setDisconnecting(null);
  };

  const getConnected = (platform: string) =>
    connected.find((c) => c.platform === platform);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-6"
    >
      <p className="text-sm leading-relaxed text-gray-500">
        Polish your public profile. This is what brands see when they find you.
      </p>

      {/* Profile Picture + Banner */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Avatar */}
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-5 text-center transition hover:border-nilink-accent-border hover:bg-nilink-accent-soft/30">
          <div
            className="relative mx-auto mb-3 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white shadow-sm overflow-hidden group"
            onClick={() => avatarInputRef.current?.click()}
          >
            {data.profilePictureUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <ImagePlus className="h-5 w-5 text-white" />
                </div>
              </>
            ) : avatarUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-nilink-accent" />
            ) : (
              <UserCircle2 className="h-8 w-8 text-gray-300" />
            )}
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Profile Picture</p>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="mt-2 text-xs text-nilink-accent underline-offset-2 hover:underline disabled:opacity-40"
          >
            {avatarUploading ? 'Uploading…' : data.profilePictureUrl ? 'Change photo' : 'Upload photo'}
          </button>
          {avatarError && (
            <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-red-500">
              <AlertCircle className="h-3 w-3" /> {avatarError}
            </p>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Banner */}
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-5 text-center transition hover:border-nilink-accent-border hover:bg-nilink-accent-soft/30">
          <div
            className="relative mx-auto mb-3 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white shadow-sm overflow-hidden group"
            onClick={() => bannerInputRef.current?.click()}
          >
            {data.profileBannerUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.profileBannerUrl} alt="Banner" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <ImagePlus className="h-5 w-5 text-white" />
                </div>
              </>
            ) : bannerUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-nilink-accent" />
            ) : (
              <ImagePlus className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Profile Banner</p>
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
            className="mt-2 text-xs text-nilink-accent underline-offset-2 hover:underline disabled:opacity-40"
          >
            {bannerUploading ? 'Uploading…' : data.profileBannerUrl ? 'Change banner' : 'Upload banner'}
          </button>
          {bannerError && (
            <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-red-500">
              <AlertCircle className="h-3 w-3" /> {bannerError}
            </p>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleBannerChange}
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className={labelClass} htmlFor="ob-bio">
          Bio <span className="text-gray-300 normal-case">(optional)</span>
        </label>
        <textarea
          id="ob-bio"
          value={data.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          rows={4}
          maxLength={500}
          className={`${inputClass} resize-none`}
          placeholder="Tell brands what makes you unique — your story, passions, audience…"
        />
        <p className="mt-1 text-right text-[10px] text-gray-400">
          {data.bio.length} / 500
        </p>
      </div>

      {/* Social Media Connections */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h3 className="mb-1 text-sm font-bold text-gray-900">Social Media Connections</h3>
        <p className="mb-4 text-xs text-gray-500">
          Connect your accounts to verify your handles and show brands your reach.
        </p>

        {connectError && (
          <p className="mb-3 flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {connectError}
          </p>
        )}

        <div className="space-y-3">
          {PLATFORMS.map(({ id, label, Icon, color, comingSoon }) => {
            const conn = getConnected(id);
            return (
              <div
                key={id}
                className={`flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3 ${comingSoon ? 'bg-gray-50/40 opacity-60' : 'bg-gray-50/60'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${comingSoon ? 'text-gray-400' : color}`} />
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  {conn && !comingSoon && (
                    <span className="truncate text-xs text-gray-500">
                      @{conn.handle}
                      {conn.followerCount > 0 && (
                        <> · {conn.followerCount.toLocaleString()} followers</>
                      )}
                    </span>
                  )}
                </div>

                {comingSoon ? (
                  <span className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Coming soon
                  </span>
                ) : conn ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                    <button
                      type="button"
                      onClick={() => handleDisconnect(id)}
                      disabled={disconnecting === id}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-40"
                    >
                      {disconnecting === id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { window.location.href = `/api/social/connect/${id}`; }}
                    className="shrink-0 rounded-xl bg-nilink-accent px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-nilink-accent-hover"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className={labelClass}>Availability Status</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {AVAILABILITY.map((opt) => {
            const active = data.availabilityStatus === opt.value;
            const ringColor =
              opt.color === 'emerald'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : opt.color === 'amber'
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'border-gray-300 bg-gray-50 text-gray-600';
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ availabilityStatus: opt.value })}
                className={`rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
                  active ? ringColor : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <motion.button
          type="button"
          onClick={onComplete}
          className="inline-flex items-center gap-2 rounded-2xl bg-nilink-accent px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check className="h-4 w-4" />
          Complete Profile
        </motion.button>
      </div>
    </motion.div>
  );
}
