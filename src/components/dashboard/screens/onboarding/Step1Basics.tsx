'use client';

import { motion } from 'framer-motion';
import { User, Mail, Phone, Globe, ArrowRight, Lock } from 'lucide-react';
import type { OnboardingBasics } from '@/hooks/useOnboardingStorage';

/* ── shared input classes (mirrors ProfileEditor) ────────────── */
const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const lockedInputClass =
  'w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none cursor-not-allowed';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

const CONTACT_OPTIONS: { value: NonNullable<OnboardingBasics['contactPreference']>; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'both', label: 'Both' },
];

interface Step1Props {
  data: OnboardingBasics;
  sessionName: string;
  sessionEmail: string;
  onChange: (patch: Partial<OnboardingBasics>) => void;
  onNext: () => void;
}

export function Step1Basics({ data, sessionName, sessionEmail, onChange, onNext }: Step1Props) {
  const filled =
    data.phone.trim().length > 0 || data.contactPreference === 'email';

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
        Let&apos;s start with who you are. This info helps brands find and reach you.
      </p>

      {/* Full name — locked from signup */}
      <div>
        <label className={labelClass} htmlFor="ob-name">
          Full Name
          <Lock className="ml-1.5 inline h-3 w-3 text-gray-300" />
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            id="ob-name"
            type="text"
            value={sessionName}
            readOnly
            className={`${lockedInputClass} pl-10`}
            title="Name from your account — edit in profile settings"
          />
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          This is the name from your account. You can change it later in profile settings.
        </p>
      </div>

      {/* Email — locked from signup  +  Alternate email */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="ob-email">
            Contact Email
            <Lock className="ml-1.5 inline h-3 w-3 text-gray-300" />
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input
              id="ob-email"
              type="email"
              value={sessionEmail}
              readOnly
              className={`${lockedInputClass} pl-10`}
              title="Email from your account"
            />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="ob-alt-email">
            Alternate Email <span className="text-gray-300">(optional)</span>
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="ob-alt-email"
              type="email"
              value={data.alternateEmail}
              onChange={(e) => onChange({ alternateEmail: e.target.value })}
              className={`${inputClass} pl-10`}
              placeholder="backup@example.com"
              autoComplete="email"
            />
          </div>
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className={labelClass} htmlFor="ob-phone">
          Phone Number
        </label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="ob-phone"
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className={`${inputClass} pl-10`}
            placeholder="+1 (555) 000-0000"
            autoComplete="tel"
          />
        </div>
      </div>

      {/* Contact preference */}
      <div>
        <label className={labelClass}>Contact Preference</label>
        <div className="flex flex-wrap gap-2">
          {CONTACT_OPTIONS.map((opt) => {
            const active = data.contactPreference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ contactPreference: opt.value })}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-nilink-accent bg-nilink-accent text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Country — USA only for now */}
      <div>
        <label className={labelClass} htmlFor="ob-country">
          Country
        </label>
        <div className="relative">
          <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            id="ob-country"
            type="text"
            value="United States"
            readOnly
            className={`${lockedInputClass} pl-10`}
            title="Only US-based athletes are supported in this version"
          />
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          Only US-based athletes are supported in this version.
        </p>
      </div>

      {/* Continue */}
      <div className="flex justify-end pt-2">
        <motion.button
          type="button"
          disabled={!filled}
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-2xl bg-nilink-accent px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          whileHover={filled ? { scale: 1.02 } : {}}
          whileTap={filled ? { scale: 0.98 } : {}}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
