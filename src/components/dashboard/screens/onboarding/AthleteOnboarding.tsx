'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, PartyPopper } from 'lucide-react';
import { useOnboardingStorage } from '@/hooks/useOnboardingStorage';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { Step1Basics } from './Step1Basics';
import { Step2Athletic } from './Step2Athletic';
import { Step3Academic } from './Step3Academic';
import { Step3Compliance } from './Step3Compliance';
import { Step4Profile } from './Step4Profile';

const TOTAL_STEPS = 5;

const STEP_META: { label: string; short: string }[] = [
  { label: 'The Basics', short: 'Basics' },
  { label: 'Athletic Identity', short: 'Sports' },
  { label: 'University', short: 'School' },
  { label: 'Verification', short: 'Verify' },
  { label: 'Profile & Socials', short: 'Profile' },
];

export function AthleteOnboarding() {
  const router = useRouter();
  const { user } = useDashboard();
  const {
    draft,
    hydrated,
    updateDraft,
    updateBasics,
    updateAthletic,
    updateAcademic,
    updateCompliance,
    updateProfile,
  } = useOnboardingStorage();

  const [completed, setCompleted] = useState(false);

  const step = draft.currentStep;

  const goTo = useCallback(
    (s: number) => updateDraft({ currentStep: Math.max(1, Math.min(s, TOTAL_STEPS)) }),
    [updateDraft],
  );

  const handleComplete = useCallback(() => {
    updateDraft({ completedAt: new Date().toISOString() });
    setCompleted(true);
  }, [updateDraft]);

  /* Percentage calc for progress bar */
  const pct = useMemo(() => Math.round(((step - 1) / TOTAL_STEPS) * 100), [step]);

  /* ──────────────── Loading state ──────────────── */
  if (!hydrated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-nilink-page py-20 font-sans text-nilink-ink">
        <Loader2 className="h-8 w-8 animate-spin text-nilink-accent" aria-hidden />
        <p className="text-sm text-gray-500">Restoring your progress…</p>
      </div>
    );
  }

  /* ──────────────── Success state ──────────────── */
  if (completed) {
    return (
      <div className="dash-main-gutter-x flex flex-1 flex-col items-center justify-center gap-6 bg-nilink-page py-20 font-sans text-nilink-ink">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 shadow-lg"
        >
          <PartyPopper className="h-12 w-12 text-emerald-600" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2
            className="text-4xl tracking-wide text-nilink-ink"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            YOU&apos;RE ALL SET!
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-gray-500">
            Your athlete profile is complete. Brands can now discover you and send deal offers.
          </p>
        </motion.div>
        <motion.button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-nilink-accent px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Go to Dashboard
        </motion.button>
      </div>
    );
  }

  /* ──────────────── Main wizard ──────────────── */
  return (
    <div className="flex flex-1 flex-col bg-nilink-page font-sans text-nilink-ink">
      {/* Header bar */}
      <div className="shrink-0 border-b border-gray-100 bg-white py-8 dash-main-gutter-x">
        <DashboardPageHeader
          title="Athlete Onboarding"
          subtitle="Set up your NIL-ready profile in 5 simple steps"
          className="mb-0"
        />
      </div>

      <div className="flex-1 py-8 dash-main-gutter-x md:py-10">
        <div className="mx-auto w-full max-w-2xl">
          {/* ── Progress tracker ── */}
          <div className="mb-10">
            {/* Step indicators */}
            <div className="mb-3 flex items-center justify-between">
              {STEP_META.map((m, i) => {
                const sNum = i + 1;
                const done = step > sNum;
                const active = step === sNum;
                return (
                  <button
                    key={m.short}
                    type="button"
                    onClick={() => {
                      if (done) goTo(sNum);
                    }}
                    disabled={!done && !active}
                    className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition ${
                      done
                        ? 'cursor-pointer text-nilink-accent'
                        : active
                          ? 'text-nilink-ink'
                          : 'cursor-default text-gray-300'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition ${
                        done
                          ? 'bg-nilink-accent text-white shadow-sm'
                          : active
                            ? 'border-2 border-nilink-accent bg-white text-nilink-accent shadow-sm'
                            : 'border border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        sNum
                      )}
                    </span>
                    <span className="hidden md:inline">{m.short}</span>
                  </button>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-nilink-accent to-nilink-accent-bright"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
            <p className="mt-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>

          {/* ── Step content ── */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1Basics
                key="step1"
                data={draft.basics}
                sessionName={user?.name ?? ''}
                sessionEmail={user?.email ?? ''}
                onChange={updateBasics}
                onNext={() => goTo(2)}
              />
            )}
            {step === 2 && (
              <Step2Athletic
                key="step2"
                data={draft.athletic}
                onChange={updateAthletic}
                onNext={() => goTo(3)}
                onBack={() => goTo(1)}
              />
            )}
            {step === 3 && (
              <Step3Academic
                key="step3"
                data={draft.academic}
                sessionEmail={user?.email ?? ''}
                onChange={updateAcademic}
                onNext={() => goTo(4)}
                onBack={() => goTo(2)}
              />
            )}
            {step === 4 && (
              <Step3Compliance
                key="step4"
                data={draft.compliance}
                onChange={updateCompliance}
                onNext={() => goTo(5)}
                onBack={() => goTo(3)}
              />
            )}
            {step === 5 && (
              <Step4Profile
                key="step5"
                data={draft.profile}
                onChange={updateProfile}
                onBack={() => goTo(4)}
                onComplete={handleComplete}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
