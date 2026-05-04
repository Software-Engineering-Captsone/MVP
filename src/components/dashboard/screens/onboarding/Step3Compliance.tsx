'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { OnboardingCompliance } from '@/hooks/useOnboardingStorage';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

interface Step3Props {
  data: OnboardingCompliance;
  schoolEmail: string;
  sessionEmail: string;
  onChange: (patch: Partial<OnboardingCompliance>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Compliance({
  data,
  schoolEmail,
  sessionEmail,
  onChange,
  onNext,
  onBack,
}: Step3Props) {
  const [emailInput, setEmailInput] = useState(schoolEmail || sessionEmail || '');
  const [codeSent, setCodeSent] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/verify/school-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? 'Failed to send code'); return; }
      setCodeSent(true);
      setCodeInput('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch('/api/verify/school-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, code: codeInput }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? 'Verification failed'); return; }
      onChange({ schoolEmailVerified: true });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-6"
    >
      <p className="text-sm leading-relaxed text-gray-500">
        Verify your student-athlete status to unlock full platform features and brand trust.
      </p>

      {/* School Email Verification */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nilink-accent-soft text-nilink-accent">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-900">School Email Verification</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Verify your .edu email to prove enrollment. We&apos;ll send a 6-digit code.
            </p>

            {data.schoolEmailVerified ? (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {/* Email input */}
                <div>
                  <label className={labelClass} htmlFor="ob-verify-email">
                    .edu Email
                  </label>
                  <input
                    id="ob-verify-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setCodeSent(false); setError(null); }}
                    className={inputClass}
                    placeholder="you@school.edu"
                    disabled={sending || verifying}
                  />
                </div>

                {/* Send / Resend button */}
                {!codeSent ? (
                  <motion.button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sending || !emailInput.endsWith('.edu')}
                    className="inline-flex items-center gap-2 rounded-xl bg-nilink-accent px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                    whileTap={{ scale: 0.97 }}
                  >
                    {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {sending ? 'Sending…' : 'Send Code'}
                  </motion.button>
                ) : (
                  <>
                    {/* OTP input */}
                    <div>
                      <label className={labelClass} htmlFor="ob-otp">
                        6-digit code
                      </label>
                      <input
                        id="ob-otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={`${inputClass} text-center text-lg font-bold tracking-[0.3em]`}
                        placeholder="——————"
                        disabled={verifying}
                        autoFocus
                      />
                      <p className="mt-1 text-[10px] text-gray-400">
                        Code sent to {emailInput} · expires in 10 min ·{' '}
                        <button
                          type="button"
                          onClick={() => { setCodeSent(false); setCodeInput(''); setError(null); }}
                          className="text-nilink-accent underline-offset-2 hover:underline"
                        >
                          Resend
                        </button>
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verifying || codeInput.length !== 6}
                      className="inline-flex items-center gap-2 rounded-xl bg-nilink-accent px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                      whileTap={{ scale: 0.97 }}
                    >
                      {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {verifying ? 'Verifying…' : 'Verify Code'}
                    </motion.button>
                  </>
                )}

                {error && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ID Verification — deferred, show waiting state */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 opacity-60">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-900">Identity Verification</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              ID verification is coming soon. You can complete onboarding and add this later.
            </p>
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
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <motion.button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-2xl bg-nilink-accent px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
