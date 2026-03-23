'use client';

import { useState, createContext, useContext, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, FileText, MessageSquare, Zap, Heart,
  CreditCard, Megaphone, BarChart3, MoreVertical,
  type LucideIcon,
} from 'lucide-react';
import { getBrandImageByName, u } from '@/lib/mockData';
import { pageTransition } from '@/components/dashboard/dashboardMotion';

export type AccountType = 'athlete' | 'business';

interface DashboardContextValue {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
}

const DashboardContext = createContext<DashboardContextValue>({
  accountType: 'athlete',
  setAccountType: () => {},
});

export function useDashboard() {
  return useContext(DashboardContext);
}

type NavItem = { href: string; icon: LucideIcon; label: string; badge?: string };

// Define navigation structure
const athleteNavigation: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/search', icon: Search, label: 'Search' },
  { href: '/dashboard/saved', icon: Heart, label: 'Saved' },
  { href: '/dashboard/deals', icon: FileText, label: 'Deals' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Inbox' },
];

const businessNavigation: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/search', icon: Search, label: 'Search' },
  { href: '/dashboard/saved', icon: Heart, label: 'Saved' },
  { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/dashboard/deals', icon: CreditCard, label: 'Deals' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Inbox' },
];


export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const [accountType, setAccountType] = useState<AccountType>(() => {
    // Read from URL search params
    const param = searchParams.get('accountType');
    if (param === 'business') return 'business';
    return 'athlete';
  });

  // Persist to cookie when changed
  useEffect(() => {
    document.cookie = `previewAccountType=${accountType};path=/;max-age=86400`;
  }, [accountType]);

  // Read from cookie on mount
  useEffect(() => {
    const match = document.cookie.match(/previewAccountType=(athlete|business)/);
    if (match) {
      setAccountType(match[1] as AccountType);
    }
  }, []);

  // Sync from URL param
  useEffect(() => {
    const param = searchParams.get('accountType');
    if (param === 'athlete' || param === 'business') {
      setAccountType(param);
    }
  }, [searchParams]);

  const navigation = accountType === 'business' ? businessNavigation : athleteNavigation;

  const userDisplay = accountType === 'business'
    ? { 
        avatar: getBrandImageByName('PowerFuel Energy'), 
        name: 'PowerFuel Energy', 
        email: 'contact@powerfuel.com' 
      }
    : { 
        avatar: u('photo-1583454110551-21f2fa2afe61', '400'), 
        name: 'Marcus Johnson', 
        email: 'marcus.j@stateui.edu' 
      };

  return (
    <DashboardContext.Provider value={{ accountType, setAccountType }}>
      <div className="flex h-screen bg-nilink-page text-nilink-ink">
        {/* Sidebar */}
        <aside className="group relative w-20 hover:w-[260px] bg-nilink-sidebar flex flex-col shadow-xl border-r border-nilink-sidebar-muted transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-50 overflow-hidden">
          {/* Logo */}
          <div className="flex h-[72px] items-center justify-center px-2 pt-6 pb-4 group-hover:justify-start group-hover:px-5">
            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center gap-0 rounded-lg outline-none group-hover:justify-start group-hover:gap-3 focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nilink-sidebar"
            >
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"
              >
                <Zap className="h-5 w-5 text-nilink-sidebar" fill="currentColor" strokeWidth={1} />
              </motion.div>
              <h1 className="max-w-0 overflow-hidden text-xl font-bold tracking-wide text-white opacity-0 transition-all duration-300 group-hover:max-w-[200px] group-hover:opacity-100 whitespace-nowrap">
                NILINK
              </h1>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex-1 overflow-y-auto overflow-x-hidden border-t border-nilink-sidebar-muted px-2 py-4 scrollbar-hide group-hover:px-3">
            <ul className="mt-4 space-y-1.5">
              {navigation.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
                  
                return (
                  <li key={item.href + item.label}>
                    <Link href={item.href} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nilink-sidebar">
                      <motion.div
                        className={`group/link flex items-center text-sm font-medium tracking-wide transition-[width,height,min-height,padding,margin,border-radius] duration-200 ease-out justify-center group-hover:justify-start ${
                          isActive
                            ? 'mx-auto box-border size-12 shrink-0 rounded-[10px] bg-stone-100 p-1 text-zinc-700 shadow-sm group-hover:mx-0 group-hover:h-auto group-hover:min-h-11 group-hover:w-full group-hover:rounded-xl group-hover:p-2'
                            : 'min-h-[44px] rounded-xl px-2 py-2 text-gray-400 hover:bg-white/[0.05] hover:text-white group-hover:px-3'
                        }`}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                          <item.icon
                            className={`h-5 w-5 ${isActive ? 'text-zinc-700' : 'text-current'}`}
                            strokeWidth={isActive ? 2.25 : 2}
                          />
                        </span>
                        <div className="relative flex min-w-0 max-w-0 items-center justify-between overflow-hidden opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:max-w-[min(200px,calc(100vw-6rem))] group-hover:flex-1 group-hover:opacity-100 whitespace-nowrap">
                          <span className={isActive ? 'font-medium text-zinc-700' : 'text-gray-400 group-hover/link:text-white'}>
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

          {/* Bottom Area */}
          <div className="mt-auto bg-nilink-sidebar p-3 group-hover:p-4">
            {/* Profile Block */}
            <div className="border-t border-nilink-sidebar-muted pt-4">
              <div className="flex w-full items-center justify-center gap-0 group-hover:justify-start group-hover:gap-3">
                <motion.img
                  src={userDisplay.avatar}
                  alt={userDisplay.name}
                  className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-gray-800 object-cover shadow-sm"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                />
                <div className="max-w-0 min-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[min(200px,calc(100vw-6rem))] group-hover:flex-1 group-hover:opacity-100 whitespace-nowrap">
                  <p className="truncate text-sm font-semibold text-white">
                    {userDisplay.name}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {userDisplay.email}
                  </p>
                </div>
                <div className="relative max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[40px] group-hover:opacity-100">
                  <motion.button 
                    type="button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-nilink-sidebar-muted hover:text-white"
                    whileTap={{ scale: 0.95 }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </motion.button>
                  
                  {isProfileMenuOpen && (
                    <div 
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                  )}
                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        key="profile-menu"
                        className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 origin-bottom-right"
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <Link 
                          href="/dashboard/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 w-full text-left"
                        >
                          Profile
                        </Link>
                        <Link 
                          href="/preview"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 w-full text-left border-t border-gray-100"
                        >
                          Switch Account
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-nilink-surface flex flex-col items-stretch">
          <motion.div
            key={pathname}
            className="flex-1 w-full min-h-full"
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
