'use client';

import { motion } from 'framer-motion';
import { MapPin, ArrowLeft, Check, Lock, User } from 'lucide-react';
import type {
  BrandCompanyInfo,
  BrandProfileBasics,
} from '@/lib/brandOnboardingPersist';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const lockedInputClass =
  'w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none cursor-not-allowed';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

const CONTACT_OPTIONS: { value: BrandProfileBasics['contactPreference']; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'both',  label: 'Both' },
];

interface Props {
  basics: BrandProfileBasics;
  company: BrandCompanyInfo;
  sessionName: string;
  onChangeBasics:  (patch: Partial<BrandProfileBasics>) => void;
  onChangeCompany: (patch: Partial<BrandCompanyInfo>) => void;
  onBack: () => void;
  onComplete: () => void;
  isBusy: boolean;
}

export function BrandStep2Location({
  basics, company, sessionName,
  onChangeBasics, onChangeCompany,
  onBack, onComplete, isBusy,
}: Props) {
  const filled =
    company.hqCountry.trim().length > 0 &&
    company.hqState.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-6"
    >
      <div className="mb-2">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-nilink-accent-soft text-nilink-accent">
          <MapPin className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2
          className="text-2xl tracking-wide text-nilink-ink"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          LOCATION & CONTACT
        </h2>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Where you&apos;re based, and how athletes should reach you.
        </p>
      </div>

      {/* HQ */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="bo-country">Country</label>
          <input
            id="bo-country" type="text" className={inputClass}
            value={company.hqCountry}
            onChange={(e) => onChangeCompany({ hqCountry: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="bo-state">State</label>
          <input
            id="bo-state" type="text" className={inputClass}
            value={company.hqState}
            onChange={(e) => onChangeCompany({ hqState: e.target.value })}
            placeholder="TX"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="bo-city">City</label>
          <input
            id="bo-city" type="text" className={inputClass}
            value={company.hqCity}
            onChange={(e) => onChangeCompany({ hqCity: e.target.value })}
            placeholder="Austin"
          />
        </div>
      </div>

      {/* Primary contact */}
      <div>
        <label className={labelClass} htmlFor="bo-contact-name">
          Primary Contact
          <Lock className="ml-1.5 inline h-3 w-3 text-gray-300" />
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            id="bo-contact-name"
            type="text"
            value={sessionName}
            readOnly
            className={`${lockedInputClass} pl-10`}
          />
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          From your account. You can edit it in profile settings after onboarding.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="bo-role">Role / title</label>
          <input
            id="bo-role" type="text" className={inputClass}
            value={company.primaryContactRole}
            onChange={(e) => onChangeCompany({ primaryContactRole: e.target.value })}
            placeholder="Head of Partnerships"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="bo-phone">Phone (optional)</label>
          <input
            id="bo-phone" type="tel" className={inputClass}
            value={basics.phone}
            onChange={(e) => onChangeBasics({ phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Preferred contact method</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CONTACT_OPTIONS.map((opt) => {
            const on = basics.contactPreference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeBasics({ contactPreference: opt.value })}
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

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <motion.button
          type="button"
          disabled={!filled || isBusy}
          onClick={onComplete}
          className="inline-flex items-center gap-2 rounded-xl bg-nilink-accent px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          whileHover={filled && !isBusy ? { scale: 1.02 } : {}}
          whileTap={filled && !isBusy ? { scale: 0.98 } : {}}
        >
          <Check className="h-4 w-4" />
          Finish Setup
        </motion.button>
      </div>
    </motion.div>
  );
}
