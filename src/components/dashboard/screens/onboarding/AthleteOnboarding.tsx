'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, PartyPopper, ArrowRight } from 'lucide-react';
import { useOnboardingStorage } from '@/hooks/useOnboardingStorage';
import { markOnboardingComplete } from '@/lib/onboardingPersist';
import { useOnboardingUser } from '@/components/onboarding/OnboardingShell';
import { Step1Basics } from './Step1Basics';
import { Step2Athletic } from './Step2Athletic';
import { Step3Academic } from './Step3Academic';
import { Step3Compliance } from './Step3Compliance';
import { Step4Profile } from './Step4Profile';

/* ────────────────────────────────────────────────
 *  Constants
 * ──────────────────────────────────────────────── */
const TOTAL_STEPS = 5;

const STEP_META = [
  { label: 'The Basics', short: 'Basics' },
  { label: 'Your Sports', short: 'Sports' },
  { label: 'School Info', short: 'School' },
  { label: 'Verify', short: 'Verify' },
  { label: 'Your Profile', short: 'Profile' },
];

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ────────────────────────────────────────────────
 *  Component
 * ──────────────────────────────────────────────── */
export function AthleteOnboarding() {
  const router = useRouter();
  const user = useOnboardingUser();

  const {
    draft,
    hydrated,
    syncError,
    updateDraft,
    updateBasics,
    updateAthletic,
    updateAcademic,
    updateCompliance,
    updateProfile,
    commitStep,
  } = useOnboardingStorage();

  const [completed, setCompleted] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [stepSaving, setStepSaving] = useState(false);
  const step = draft.currentStep;

  const goTo = useCallback(
    (s: number) => updateDraft({ currentStep: Math.max(1, Math.min(s, TOTAL_STEPS)) }),
    [updateDraft],
  );

  const handleComplete = useCallback(async () => {
    setCompleteError(null);
    try {
      await commitStep(1);
      await commitStep(2);
      await commitStep(3);
      await commitStep(4);
      await commitStep(5);
      await markOnboardingComplete();
      updateDraft({ completedAt: new Date().toISOString() });
      setCompleted(true);
    } catch {
      setCompleteError(syncError ?? 'Failed to save. Please try again.');
    }
  }, [commitStep, updateDraft, syncError]);

  const advanceStep = useCallback(
    async (fromStep: number, toStep: number) => {
      if (stepSaving) return;
      setStepError(null);
      setStepSaving(true);
      try {
        await commitStep(fromStep);
        goTo(toStep);
      } catch (err) {
        setStepError(err instanceof Error ? err.message : syncError ?? 'Failed to save this step.');
      } finally {
        setStepSaving(false);
      }
    },
    [commitStep, goTo, syncError, stepSaving]
  );

  const pct = useMemo(() => Math.round(((step - 1) / TOTAL_STEPS) * 100), [step]);

  /* ── Loading ── */
  if (!hydrated) {
    return (
      <div className="flex w-full flex-1 items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-nilink-accent" />
          <p className="text-xs font-medium text-gray-400">Restoring your progress…</p>
        </motion.div>
      </div>
    );
  }

  /* ── Success celebration ── */
  if (completed) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-7 px-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 shadow-lg ring-1 ring-emerald-100"
        >
          <PartyPopper className="h-12 w-12 text-emerald-500" />
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
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
            Your athlete profile is complete. Brands can now discover you and send deal offers.
          </p>
        </motion.div>
        <motion.button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-nilink-accent px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-nilink-accent-hover"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    );
  }

  /* ── Main wizard ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="w-full max-w-2xl"
    >
      {/* ── Card ── */}
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50">

        {/* ── Header / Stepper ── */}
        <div className="border-b border-gray-100 px-6 pt-7 pb-6 sm:px-10">
          {/* Label */}
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-nilink-accent">
            Onboarding · Step {step} of {TOTAL_STEPS}
          </p>
          <h1
            className="text-[1.65rem] leading-tight tracking-wide text-nilink-ink sm:text-[1.85rem]"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {STEP_META[step - 1].label}
          </h1>

          {/* Step dots + progress */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {STEP_META.map((m, i) => {
                const sNum = i + 1;
                const done = step > sNum;
                const active = step === sNum;
                return (
                  <button
                    key={m.short}
                    type="button"
                    onClick={() => { if (done) goTo(sNum); }}
                    disabled={!done}
                    aria-label={`Step ${sNum}: ${m.label}`}
                    className="group relative flex items-center"
                  >
                    <span
                      className={`block h-2 rounded-full transition-all duration-300 ${
                        active
                          ? 'w-7 bg-nilink-accent'
                          : done
                            ? 'w-2 bg-nilink-accent/60 group-hover:bg-nilink-accent'
                            : 'w-2 bg-gray-200'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-300">
              {pct}%
            </span>
          </div>
        </div>

        {/* ── Step content ── */}
        <div className="px-6 py-7 sm:px-10 sm:py-9">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1Basics
                key="step1"
                data={draft.basics}
                sessionName={user?.name ?? ''}
                sessionEmail={user?.email ?? ''}
                onChange={updateBasics}
                onNext={() => {
                  void advanceStep(1, 2);
                }}
              />
            )}
            {step === 2 && (
              <Step2Athletic
                key="step2"
                data={draft.athletic}
                onChange={updateAthletic}
                onNext={() => {
                  void advanceStep(2, 3);
                }}
                onBack={() => goTo(1)}
              />
            )}
            {step === 3 && (
              <Step3Academic
                key="step3"
                data={draft.academic}
                sessionEmail={user?.email ?? ''}
                onChange={updateAcademic}
                onNext={() => {
                  void advanceStep(3, 4);
                }}
                onBack={() => goTo(2)}
              />
            )}
            {step === 4 && (
              <Step3Compliance
                key="step4"
                data={draft.compliance}
                schoolEmail={draft.academic.schoolEmail}
                sessionEmail={user?.email ?? ''}
                onChange={updateCompliance}
                onNext={() => {
                  void advanceStep(4, 5);
                }}
                onBack={() => goTo(3)}
              />
            )}
            {step === 5 && (
              <>
                <Step4Profile
                  key="step5"
                  data={draft.profile}
                  userId={user?.id ?? ''}
                  onChange={updateProfile}
                  onBack={() => goTo(4)}
                  onComplete={handleComplete}
                />
                {completeError && (
                  <p className="mt-2 text-center text-xs text-red-500">{completeError}</p>
                )}
              </>
            )}
          </AnimatePresence>
          {stepSaving ? (
            <p className="mt-3 text-center text-xs text-gray-500">Saving step…</p>
          ) : null}
          {stepError ? <p className="mt-3 text-center text-xs text-red-500">{stepError}</p> : null}
        </div>
      </div>
    </motion.div>
  );
}
