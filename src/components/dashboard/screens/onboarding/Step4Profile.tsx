'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  Instagram,
  Twitter,
  ImagePlus,
  Check,
} from 'lucide-react';
import type { OnboardingProfile } from '@/hooks/useOnboardingStorage';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const AVAILABILITY: { value: NonNullable<OnboardingProfile['availabilityStatus']>; label: string; color: string }[] = [
  { value: 'available', label: 'Open to Deals', color: 'emerald' },
  { value: 'busy', label: 'Limited Availability', color: 'amber' },
  { value: 'not_looking', label: 'Not Looking', color: 'gray' },
];

interface Step4Props {
  data: OnboardingProfile;
  onChange: (patch: Partial<OnboardingProfile>) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function Step4Profile({ data, onChange, onBack, onComplete }: Step4Props) {
  const filled = true; // Temporary: Dev mode allows skipping this section

  const updateSocial = (key: keyof OnboardingProfile['socials'], value: string) => {
    onChange({ socials: { ...data.socials, [key]: value } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-6"
    >
      {/* Helper text */}
      <p className="text-sm leading-relaxed text-gray-500">
        Polish your public profile. This is what brands see when they find you.
      </p>

      {/* Profile Picture + Banner */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Picture */}
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-5 text-center transition hover:border-nilink-accent-border hover:bg-nilink-accent-soft/30">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <ImagePlus className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Profile Picture</p>
          <label className={`${labelClass} mt-3`} htmlFor="ob-pic-url">
            Image URL <span className="text-gray-300 normal-case">(optional)</span>
          </label>
          <input
            id="ob-pic-url"
            type="url"
            value={data.profilePictureUrl}
            onChange={(e) => onChange({ profilePictureUrl: e.target.value })}
            className={inputClass}
            placeholder="https://…"
          />
        </div>

        {/* Banner */}
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-5 text-center transition hover:border-nilink-accent-border hover:bg-nilink-accent-soft/30">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <ImagePlus className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Profile Banner</p>
          <label className={`${labelClass} mt-3`} htmlFor="ob-banner-url">
            Image URL <span className="text-gray-300 normal-case">(optional)</span>
          </label>
          <input
            id="ob-banner-url"
            type="url"
            value={data.profileBannerUrl}
            onChange={(e) => onChange({ profileBannerUrl: e.target.value })}
            className={inputClass}
            placeholder="https://…"
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
          className={`${inputClass} resize-none`}
          placeholder="Tell brands what makes you unique — your story, passions, audience…"
        />
        <p className="mt-1 text-right text-[10px] text-gray-400">
          {data.bio.length} / 500
        </p>
      </div>

      {/* Social Media Links */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-gray-900">Social Media Connections</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Instagram className="h-3.5 w-3.5 text-pink-500" aria-hidden /> Instagram
            </label>
            <input
              type="text"
              value={data.socials.instagram}
              onChange={(e) => updateSocial('instagram', e.target.value)}
              className={inputClass}
              placeholder="@handle"
            />
          </div>
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <TiktokIcon className="h-3.5 w-3.5 text-nilink-ink" /> TikTok
            </label>
            <input
              type="text"
              value={data.socials.tiktok}
              onChange={(e) => updateSocial('tiktok', e.target.value)}
              className={inputClass}
              placeholder="@handle"
            />
          </div>
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Twitter className="h-3.5 w-3.5 text-sky-500" aria-hidden /> X (Twitter)
            </label>
            <input
              type="text"
              value={data.socials.twitter}
              onChange={(e) => updateSocial('twitter', e.target.value)}
              className={inputClass}
              placeholder="@handle"
            />
          </div>
          <div>
            <label className={labelClass}>Other</label>
            <input
              type="text"
              value={data.socials.other}
              onChange={(e) => updateSocial('other', e.target.value)}
              className={inputClass}
              placeholder="YouTube, Snapchat, etc."
            />
          </div>
        </div>
      </div>

      {/* Social following */}
      <div>
        <label className={labelClass} htmlFor="ob-following">
          Total Social Media Following
        </label>
        <input
          id="ob-following"
          type="text"
          value={data.socialMediaFollowing}
          onChange={(e) => onChange({ socialMediaFollowing: e.target.value })}
          className={inputClass}
          placeholder="e.g. 25K combined"
        />
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
          disabled={!filled}
          onClick={onComplete}
          className="inline-flex items-center gap-2 rounded-2xl bg-nilink-accent px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          whileHover={filled ? { scale: 1.02 } : {}}
          whileTap={filled ? { scale: 0.98 } : {}}
        >
          <Check className="h-4 w-4" />
          Complete Profile
        </motion.button>
      </div>
    </motion.div>
  );
}
