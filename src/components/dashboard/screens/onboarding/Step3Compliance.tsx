'use client';

import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Mail,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
} from 'lucide-react';
import type { OnboardingCompliance } from '@/hooks/useOnboardingStorage';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

interface Step3Props {
  data: OnboardingCompliance;
  onChange: (patch: Partial<OnboardingCompliance>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Compliance({ data, onChange, onNext, onBack }: Step3Props) {
  const filled = true; // All fields on this step are optional or mock-verifiable

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="mb-2">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-nilink-accent-soft text-nilink-accent">
          <ShieldCheck className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2
          className="text-2xl tracking-wide text-nilink-ink"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          VERIFICATION & COMPLIANCE
        </h2>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Verify your student-athlete status to unlock full platform features and brand trust.
        </p>
      </div>

      {/* School Email Verification */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nilink-accent-soft text-nilink-accent">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-900">School Email Verification</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Verify your .edu email to prove enrollment. We&apos;ll send a verification link.
            </p>
            <div className="mt-3">
              <motion.button
                type="button"
                onClick={() => onChange({ schoolEmailVerified: true })}
                disabled={data.schoolEmailVerified}
                className={`rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-widest transition ${
                  data.schoolEmailVerified
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'bg-nilink-accent text-white hover:bg-nilink-accent-hover'
                }`}
                whileTap={!data.schoolEmailVerified ? { scale: 0.97 } : {}}
              >
                {data.schoolEmailVerified ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  'Send Verification Email'
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* ID Verification */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nilink-accent-soft text-nilink-accent">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-900">Identity Verification</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Upload a valid government ID for trust & safety. Your data is encrypted.
            </p>
            <div className="mt-3">
              <motion.button
                type="button"
                onClick={() => onChange({ idVerified: true })}
                disabled={data.idVerified}
                className={`rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-widest transition ${
                  data.idVerified
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'bg-nilink-accent text-white hover:bg-nilink-accent-hover'
                }`}
                whileTap={!data.idVerified ? { scale: 0.97 } : {}}
              >
                {data.idVerified ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  'Upload ID'
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* ACO + NIL */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-nilink-accent" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">NIL Compliance</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Some schools require NIL deals to be disclosed to the Athletic Compliance Office (ACO).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="ob-aco-email">
              ACO Email <span className="text-gray-300">(optional)</span>
            </label>
            <input
              id="ob-aco-email"
              type="email"
              value={data.acoEmail}
              onChange={(e) => onChange({ acoEmail: e.target.value })}
              className={inputClass}
              placeholder="compliance@university.edu"
            />
          </div>
          <div>
            <label className={labelClass}>NIL Disclosure Required?</label>
            <div className="flex gap-2">
              {(['yes', 'no'] as const).map((val) => {
                const active = data.nilDisclosureRequired === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChange({ nilDisclosureRequired: val })}
                    className={`flex-1 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
                      active
                        ? 'border-nilink-accent bg-nilink-accent text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <motion.button
          type="button"
          disabled={!filled}
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-nilink-accent px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
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
