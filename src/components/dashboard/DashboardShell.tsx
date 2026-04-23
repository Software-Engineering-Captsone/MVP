'use client';

import { useState, createContext, useContext, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, FileText, MessageSquare, Heart,
  CreditCard, Megaphone, BarChart3, MoreVertical,
  type LucideIcon,
} from 'lucide-react';
import { NilinkLogoMark, NilinkLogoText } from '@/components/brand/NilinkLogo';
import { pageTransition } from '@/components/dashboard/dashboardMotion';
import { createClient } from '@/lib/supabase/client';
import { userAvatarDataUrl } from '@/lib/userAvatar';
import { resolveSupabaseRole } from '@/lib/auth/supabaseRole';

export type AccountType = 'athlete' | 'business';

export type DashboardUser = {
  id: string;
  email: string;
  name: string;
  role: 'athlete' | 'brand';
};

interface DashboardContextValue {
  accountType: AccountType;
  user: DashboardUser | null;
  /** Re-fetch user data (e.g. after profile save). */
  refreshUser: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue>({
  accountType: 'athlete',
  user: null,
  refreshUser: async () => {},
});

export function useDashboard() {
  return useContext(DashboardContext);
}

type NavItem = { href: string; icon: LucideIcon; label: string; badge?: string };

const athleteNavigation: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/search', icon: Search, label: 'Explore' },
  { href: '/dashboard/saved', icon: Heart, label: 'Saved' },
  { href: '/dashboard/deals', icon: FileText, label: 'Deals' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
];

const businessNavigation: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/saved', icon: Heart, label: 'Saved' },
  { href: '/dashboard/search', icon: Search, label: 'Explore' },
  { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/dashboard/deals', icon: CreditCard, label: 'Deals' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
];

/** Inbox sits above profile (below main nav), not in the scrollable list. */
const inboxNavItem: NavItem = {
  href: '/dashboard/messages',
  icon: MessageSquare,
  label: 'Inbox',
};

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<DashboardUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [booting, setBooting] = useState(true);
  const signOutRequestedRef = useRef(false);

  const supabase = createClient();

  const mapSupabaseUser = useCallback((supaUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  }): DashboardUser => {
    const meta = supaUser.user_metadata ?? {};
    const role = resolveSupabaseRole({
      userMetadata: supaUser.user_metadata,
      appMetadata: supaUser.app_metadata,
    });
    const name = (meta.full_name as string)
      || (meta.name as string)
      || supaUser.email?.split('@')[0]
      || 'User';
    return {
      id: supaUser.id,
      email: supaUser.email ?? '',
      name,
      role,
    };
  }, []);

  const fetchAvatar = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    setAvatarUrl(data?.avatar_url ?? '');
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setSessionUser(mapSupabaseUser(user));
      await fetchAvatar(user.id);
    }
  }, [supabase, mapSupabaseUser, fetchAvatar]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSessionUser(mapSupabaseUser(user));
        void fetchAvatar(user.id);
      } else {
        router.replace(signOutRequestedRef.current ? '/' : '/auth');
      }
      setBooting(false);
    });

    // Listen for auth state changes (sign out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setSessionUser(mapSupabaseUser(session.user));
          void fetchAvatar(session.user.id);
        } else {
          setSessionUser(null);
          setAvatarUrl('');
          router.replace(signOutRequestedRef.current ? '/' : '/auth');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, mapSupabaseUser, fetchAvatar]);

  /* ── Onboarding gate for athletes ──
   * Source of truth: profiles.onboarding_completed_at. We query it once
   * per signed-in user, then cache the verdict in onboardingCheckedFor
   * so the dashboard doesn't pay the round-trip on every navigation.
   */
  const [onboardingCheckedFor, setOnboardingCheckedFor] = useState<string | null>(null);

  useEffect(() => {
    if (booting || !sessionUser) return;
    // Gate applies to both roles now — brands have their own wizard at
    // /dashboard/onboarding and share the onboarding_completed_at column.
    // Already decided for this user — nothing to do.
    if (onboardingCheckedFor === sessionUser.id) return;
    // Don't gate the wizard itself.
    if (pathname.startsWith('/dashboard/onboarding')) {
      setOnboardingCheckedFor(sessionUser.id);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('id', sessionUser.id)
          .single();
        if (cancelled) return;
        if (!error && !data?.onboarding_completed_at) {
          router.replace('/dashboard/onboarding');
        }
      } catch {
        /* network error — don't trap the user; treat as decided */
      } finally {
        if (!cancelled) setOnboardingCheckedFor(sessionUser.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [booting, sessionUser, pathname, router, supabase, onboardingCheckedFor]);

  // Hold the dashboard chrome until: (a) we know who's signed in, and
  // (b) we've checked their onboarding state. Without (b), a non-onboarded
  // user (athlete or brand) would see the dashboard for one frame before
  // the redirect kicks in.
  const onAuthenticatedShellRoute = pathname.startsWith('/dashboard/onboarding');
  const gateUndecided =
    !!sessionUser &&
    onboardingCheckedFor !== sessionUser.id &&
    !onAuthenticatedShellRoute;

  if (booting || gateUndecided) {
    return (
      <div className="flex h-screen items-center justify-center bg-nilink-page text-nilink-ink">
        <p className="text-sm text-gray-500">Loading your workspace…</p>
      </div>
    );
  }

  if (!sessionUser) {
    return null;
  }

  const accountType: AccountType = sessionUser.role === 'brand' ? 'business' : 'athlete';
  const navigation = accountType === 'business' ? businessNavigation : athleteNavigation;

  const userDisplay = {
    avatar: avatarUrl || userAvatarDataUrl(sessionUser.name),
    name: sessionUser.name,
    email: sessionUser.email,
  };

  const InboxIcon = inboxNavItem.icon;
  const inboxActive = pathname.startsWith(inboxNavItem.href);

  const handleSignOut = async () => {
    signOutRequestedRef.current = true;
    await supabase.auth.signOut();
    // Drop per-browser onboarding state so the next sign-in (potentially a
    // different account) hydrates cleanly from the DB instead of inheriting
    // this user's localStorage draft.
    try {
      localStorage.removeItem('athlete_onboarding_draft');
      localStorage.removeItem('nilink_last_user_id');
    } catch {
      /* localStorage unavailable — nothing to clean */
    }
    setIsProfileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  return (
    <DashboardContext.Provider value={{ accountType, user: sessionUser, refreshUser }}>
      <div className="flex h-screen bg-nilink-page text-nilink-ink">
        <aside
          className="group relative z-50 flex h-screen w-20 shrink-0 flex-col overflow-hidden border-r border-nilink-sidebar-muted bg-nilink-sidebar shadow-xl transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:w-[260px]"
          onMouseLeave={() => setIsProfileMenuOpen(false)}
        >
          <div className="shrink-0 px-3 pb-4 pt-6">
            <Link
              href="/dashboard"
              className="block w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nilink-sidebar"
            >
              <div className="flex min-h-[44px] w-full items-center justify-center gap-0 rounded-xl px-2 py-2 group-hover:justify-start group-hover:gap-2">
                <motion.span
                  className="flex h-10 w-10 shrink-0 items-center justify-center"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <NilinkLogoMark surface="inverse" />
                </motion.span>
                <NilinkLogoText surface="dark" collapsible />
              </div>
            </Link>
          </div>

          <nav className="mt-6 min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-t border-nilink-sidebar-muted px-3 py-4 scrollbar-hide">
            <ul className="mt-4 space-y-1.5">
              {navigation.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nilink-sidebar"
                    >
                      <motion.div
                        className={`group/link flex min-h-[44px] w-full items-center justify-start gap-2 rounded-xl px-2 py-2 text-sm font-medium tracking-wide transition-colors duration-200 ${
                          isActive
                            ? 'bg-stone-100 text-zinc-700 shadow-sm'
                            : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
                        }`}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                          <item.icon
                            className={`h-5 w-5 ${isActive ? 'text-zinc-700' : 'text-current'}`}
                            strokeWidth={isActive ? 2.25 : 2}
                          />
                        </span>
                        <div className="relative flex min-w-0 max-w-0 flex-1 items-center justify-between overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[min(200px,calc(100vw-6rem))] group-hover:opacity-100 whitespace-nowrap">
                          <span
                            className={
                              isActive
                                ? 'font-medium text-zinc-700'
                                : 'text-gray-400 group-hover/link:text-white'
                            }
                          >
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="shrink-0 rounded-full bg-nilink-accent px-2 py-0.5 text-[10px] font-bold text-white">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto shrink-0 bg-nilink-sidebar px-3 pb-3 pt-3">
            <ul className="space-y-1.5">
              <li>
                <Link
                  href={inboxNavItem.href}
                  className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nilink-sidebar"
                >
                  <motion.div
                    className={`group/link flex min-h-[44px] w-full items-center justify-start gap-2 rounded-xl px-2 py-2 text-sm font-medium tracking-wide transition-colors duration-200 ${
                      inboxActive
                        ? 'bg-stone-100 text-zinc-700 shadow-sm'
                        : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <InboxIcon
                        className={`h-5 w-5 ${inboxActive ? 'text-zinc-700' : 'text-current'}`}
                        strokeWidth={inboxActive ? 2.25 : 2}
                      />
                    </span>
                    <div className="relative flex min-w-0 max-w-0 flex-1 items-center justify-between overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[min(200px,calc(100vw-6rem))] group-hover:opacity-100 whitespace-nowrap">
                      <span
                        className={
                          inboxActive
                            ? 'font-medium text-zinc-700'
                            : 'text-gray-400 group-hover/link:text-white'
                        }
                      >
                        {inboxNavItem.label}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              </li>
            </ul>

            <div className="mt-3 border-t border-nilink-sidebar-muted pt-3">
              <div className="relative">
                <motion.button
                  type="button"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsProfileMenuOpen((open) => !open)}
                  className="flex w-full min-h-[44px] items-center justify-start gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-left outline-none transition-colors hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nilink-sidebar"
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <img
                      src={userDisplay.avatar}
                      alt=""
                      className="pointer-events-none h-9 w-9 rounded-full border border-white/10 bg-gray-800 object-cover shadow-sm"
                    />
                  </span>
                  <div className="pointer-events-none min-w-0 max-w-0 flex-1 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[min(200px,calc(100vw-6rem))] group-hover:opacity-100 whitespace-nowrap">
                    <p className="truncate text-sm font-semibold text-white">{userDisplay.name}</p>
                    <p className="truncate text-xs text-gray-400">{userDisplay.email}</p>
                  </div>
                  <MoreVertical
                    className="pointer-events-none h-4 w-4 max-w-0 shrink-0 text-gray-400 opacity-0 transition-all duration-300 group-hover:max-w-[20px] group-hover:opacity-100"
                    aria-hidden
                  />
                </motion.button>

                {isProfileMenuOpen && (
                  <div
                    className="fixed inset-0 z-40 cursor-pointer"
                    aria-hidden
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                )}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      key="profile-menu"
                      role="menu"
                      className="absolute bottom-full right-0 z-50 mb-2 w-48 origin-bottom-right rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <Link
                        href="/dashboard/profile"
                        role="menuitem"
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Edit profile
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full border-t border-gray-100 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={handleSignOut}
                      >
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-nilink-surface">
          <motion.div
            key={pathname}
            className="flex min-h-full min-w-0 w-full flex-1 flex-col"
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            transition={pageTransition.transition}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </DashboardContext.Provider>
  );
}
