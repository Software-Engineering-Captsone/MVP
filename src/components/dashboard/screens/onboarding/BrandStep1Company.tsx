'use client';

import { motion } from 'framer-motion';
import { Building2, ArrowRight, Lock, Mail } from 'lucide-react';
import type { BrandCompanyInfo } from '@/lib/brandOnboardingPersist';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const lockedInputClass =
  'w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none cursor-not-allowed';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

const INDUSTRIES = [
  'Sports Nutrition', 'Apparel', 'Fitness Tech', 'Beverages',
  'Footwear', 'Fitness Equipment', 'Other',
] as const;

interface Props {
  data: BrandCompanyInfo;
  sessionEmail: string;
  onChange: (patch: Partial<BrandCompanyInfo>) => void;
  onNext: () => void;
  isBusy: boolean;
}

export function BrandStep1Company({ data, sessionEmail, onChange, onNext, isBusy }: Props) {
  const filled =
    data.companyName.trim().length > 0 &&
    data.industry.trim().length > 0;

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
          <Building2 className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2
          className="text-2xl tracking-wide text-nilink-ink"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          YOUR COMPANY
        </h2>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Tell athletes who you are. You can expand all of this later in your profile.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="bo-email">
          Account Email
          <Lock className="ml-1.5 inline h-3 w-3 text-gray-300" />
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            id="bo-email"
            type="email"
            value={sessionEmail}
            readOnly
            className={`${lockedInputClass} pl-10`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="bo-company">Company name</label>
        <input
          id="bo-company" type="text" className={inputClass}
          value={data.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          placeholder="PowerFuel Energy"
          autoComplete="organization"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="bo-industry">Industry</label>
          <select
            id="bo-industry"
            className={`${inputClass} appearance-none`}
            value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
          >
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="bo-website">Website</label>
          <input
            id="bo-website" type="text" className={inputClass}
            value={data.website}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="example.com"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="bo-tagline">Tagline</label>
        <input
          id="bo-tagline" type="text" className={inputClass}
          value={data.tagline}
          onChange={(e) => onChange({ tagline: e.target.value })}
          placeholder="One-line pitch (optional)"
        />
      </div>

      <div className="flex items-center justify-end pt-2">
        <motion.button
          type="button"
          disabled={!filled || isBusy}
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-nilink-accent px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          whileHover={filled && !isBusy ? { scale: 1.02 } : {}}
          whileTap={filled && !isBusy ? { scale: 0.98 } : {}}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
