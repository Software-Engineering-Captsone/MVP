'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, PartyPopper } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useDashboard } from '@/components/dashboard/DashboardShell';
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
import { BrandStep1Company } from './BrandStep1Company';
import { BrandStep2Location } from './BrandStep2Location';

const TOTAL_STEPS = 2;
const STEPS: { short: string; label: string }[] = [
  { short: 'Company',  label: 'Your Company' },
  { short: 'Location', label: 'Location & Contact' },
];

export function BrandOnboarding() {
  const router = useRouter();
  const { user } = useDashboard();

  const [draft, setDraft] = useState<BrandOnboardingDraft>(defaultBrandDraft());
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // ── Hydrate from DB on mount. No localStorage cache for brand —
  //    data volume is small and every step commits anyway.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const state = await loadBrandOnboardingState();
        const next = hydrateBrandDraft(state);
        if (cancelled) return;
        setDraft(next);
        // Defensive — the dashboard gate should already have redirected
        // an onboarded brand away, but flip to success if they land here.
        if (next.completedAt) setCompleted(true);
      } catch {
        // Fall back to defaults — still usable, just no resume.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const patchBasics = useCallback(
    (patch: Partial<BrandProfileBasics>) =>
      setDraft(d => ({ ...d, basics: { ...d.basics, ...patch } })),
    [],
  );
  const patchCompany = useCallback(
    (patch: Partial<BrandCompanyInfo>) =>
      setDraft(d => ({ ...d, company: { ...d.company, ...patch } })),
    [],
  );

  // Advance a step: commit the full draft first, then move forward.
  // Same expectation as athlete side — failure keeps the user on the
  // current step so they can retry without losing input.
  const advance = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await persistBrandCompanyInfo(draft.basics, draft.company);
      setStep(s => Math.min(TOTAL_STEPS, s + 1));
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Could not save this step');
    } finally {
      setSyncing(false);
    }
  }, [draft, syncing]);

  const handleComplete = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await persistBrandCompanyInfo(draft.basics, draft.company);
      const ts = await markBrandOnboardingComplete();
      setDraft(d => ({ ...d, completedAt: ts }));
      setCompleted(true);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Could not finish onboarding');
    } finally {
      setSyncing(false);
    }
  }, [draft, syncing]);

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
            Your brand profile is live. You can start creating campaigns and discovering athletes.
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
      <div className="shrink-0 border-b border-gray-100 bg-white py-8 dash-main-gutter-x">
        <DashboardPageHeader
          title="Brand Onboarding"
          subtitle={`Set up your brand in ${TOTAL_STEPS} quick steps`}
          className="mb-0"
        />
      </div>

      <div className="flex-1 py-8 dash-main-gutter-x md:py-10">
        <div className="mx-auto w-full max-w-2xl">
          {/* Progress tracker */}
          <div className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              {STEPS.map((m, i) => {
                const sNum = i + 1;
                const done = step > sNum;
                const active = step === sNum;
                return (
                  <button
                    key={m.short}
                    type="button"
                    onClick={() => { if (done) setStep(sNum); }}
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
                      {done ? <CheckCircle2 className="h-4 w-4" /> : sNum}
                    </span>
                    <span className="hidden md:inline">{m.short}</span>
                  </button>
                );
              })}
            </div>
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

          {syncError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{syncError}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <BrandStep1Company
                key="brand-step-1"
                data={draft.company}
                sessionEmail={user?.email ?? draft.email}
                onChange={patchCompany}
                onNext={() => void advance()}
                isBusy={syncing}
              />
            )}
            {step === 2 && (
              <BrandStep2Location
                key="brand-step-2"
                basics={draft.basics}
                company={draft.company}
                sessionName={user?.name ?? ''}
                onChangeBasics={patchBasics}
                onChangeCompany={patchCompany}
                onBack={() => setStep(1)}
                onComplete={() => void handleComplete()}
                isBusy={syncing}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
