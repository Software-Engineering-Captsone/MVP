'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { NilinkLogoMark, NilinkLogoText } from '@/components/brand/NilinkLogo';
import { createClient } from '@/lib/supabase/client';
import type { DashboardUser } from '@/components/dashboard/DashboardShell';

/* ── Context so child steps can access user ── */
interface OnboardingContextValue {
  user: DashboardUser | null;
}

const OnboardingContext = createContext<OnboardingContextValue>({ user: null });

export function useOnboardingUser() {
  return useContext(OnboardingContext).user;
}

/** Maps Supabase user to our DashboardUser shape. */
function mapUser(supaUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): DashboardUser {
  const meta = supaUser.user_metadata ?? {};
  const role = meta.role === 'brand' ? 'brand' : 'athlete';
  const name =
    (meta.full_name as string) ||
    (meta.name as string) ||
    supaUser.email?.split('@')[0] ||
    'User';
  return { id: supaUser.id, email: supaUser.email ?? '', name, role };
}

/**
 * Dedicated shell for onboarding — no sidebar, no dashboard nav.
 * Handles its own auth. Renders children in a focused, distraction-free layout.
 */
export default function OnboardingShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser(mapUser(u));
      } else {
        router.replace('/auth');
      }
      setBooting(false);
    });
  }, [supabase, router]);

  // If already onboarded, send them to dashboard
  useEffect(() => {
    if (booting || !user) return;
    try {
      const raw = localStorage.getItem('athlete_onboarding_draft');
      if (raw) {
        const draft = JSON.parse(raw) as { completedAt?: string };
        if (draft.completedAt) {
          router.replace('/dashboard');
        }
      }
    } catch {
      /* ignore */
    }
  }, [booting, user, router]);

  /* ── Boot screen ── */
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nilink-page">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <NilinkLogoMark surface="light" className="h-10 w-10" />
          <p className="text-sm font-medium text-gray-400">Loading…</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <OnboardingContext.Provider value={{ user }}>
      <div className="relative flex min-h-screen flex-col bg-nilink-page">
        {/* ── Top bar — minimal branding ── */}
        <header className="shrink-0 px-6 py-5 sm:px-10">
          <div className="flex items-center gap-2.5">
            <NilinkLogoMark surface="light" />
            <NilinkLogoText surface="light" className="text-nilink-ink" />
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex flex-1 flex-col items-center px-4 pb-12 pt-2 sm:px-6 md:pt-6">
          {children}
        </main>

        {/* ── Subtle footer ── */}
        <footer className="shrink-0 px-6 py-4 text-center text-[10px] font-medium uppercase tracking-widest text-gray-300 sm:px-10">
          © {new Date().getFullYear()} NILINK · All rights reserved
        </footer>
      </div>
    </OnboardingContext.Provider>
  );
}
