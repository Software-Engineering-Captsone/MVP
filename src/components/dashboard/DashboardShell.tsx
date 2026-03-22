'use client';

import { useState, createContext, useContext, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Home, User, Search, FileText, MessageSquare, Zap, Heart,
  GraduationCap, Building2, CreditCard, Megaphone, BarChart3,
} from 'lucide-react';

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

// Define navigation structure
const athleteNavigation = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/search', icon: Search, label: 'Search' },
  { href: '/dashboard/saved', icon: Heart, label: 'Saved' },
  { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/dashboard/deals', icon: FileText, label: 'Deals' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Inbox' },
];

const businessNavigation = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/search', icon: Search, label: 'Search' },
  { href: '/dashboard/saved', icon: Heart, label: 'Saved' },
  { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/dashboard/deals', icon: CreditCard, label: 'Deals' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Inbox' },
];


import { Settings, MoreVertical } from 'lucide-react';

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
        avatar: '/athletes_images/Athlete17.jpg', 
        name: 'PowerFuel Energy', 
        email: 'contact@powerfuel.com' 
      }
    : { 
        avatar: '/athletes_images/Athlete16.jpeg', 
        name: 'Marcus Johnson', 
        email: 'marcus.j@stateui.edu' 
      };

  return (
    <DashboardContext.Provider value={{ accountType, setAccountType }}>
      <div className="flex h-screen bg-[#F9FAFB] text-gray-900">
        {/* Sidebar */}
        <aside 
          className="group relative w-20 hover:w-[260px] bg-[#1C1C1E] flex flex-col shadow-xl border-r border-[#2D2D2F] transition-all duration-300 ease-in-out z-50 overflow-hidden"
        >
          {/* Logo */}
          <div className="px-5 pt-6 pb-4 h-[72px] flex items-center">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-5 h-5 text-[#1C1C1E]" fill="#1C1C1E" strokeWidth={1} />
              </div>
              <h1 className="text-xl font-bold tracking-wide text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                NILINK
              </h1>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 mt-6 overflow-y-auto overflow-x-hidden scrollbar-hide py-4 border-t border-[#2D2D2F]">
            <ul className="space-y-1 mt-4">
              {navigation.map((item: any) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
                  
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-3 py-2.5 rounded-xl transition-all text-sm font-medium tracking-wide relative group/link ${
                        isActive
                          ? 'bg-[#2D2D2F] shadow-sm'
                          : 'hover:bg-[#2D2D2F]/50'
                      }`}
                    >
                      <item.icon 
                        className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-300 group-hover/link:text-white'}`} 
                        strokeWidth={ isActive ? 2.5 : 2 } 
                      />
                      <div className="flex items-center justify-between w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-3 whitespace-nowrap overflow-hidden">
                        <span className={isActive ? 'text-white' : 'text-gray-300 group-hover/link:text-white'}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2A90B0] text-white">
                            {item.badge}

                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Area */}
          <div className="p-4 bg-[#1C1C1E] mt-auto">
            {/* Profile Block */}
            <div className="pt-4 border-t border-[#2D2D2F]">
              <div className="flex items-center gap-3 w-full">
                <img
                  src={userDisplay.avatar}
                  alt={userDisplay.name}
                  className="w-9 h-9 rounded-full object-cover shadow-sm bg-gray-800 shrink-0"
                />
                <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
                  <p className="text-sm font-semibold text-white truncate">
                    {userDisplay.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {userDisplay.email}
                  </p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="text-gray-400 hover:text-white hover:bg-[#2D2D2F] p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {isProfileMenuOpen && (
                    <>
                      {/* Invisible backdrop to close menu when clicking outside */}
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#2D2D2F] rounded-lg shadow-xl border border-[#3A3A3C] py-1 z-50">
                        <Link 
                          href="/dashboard/profile"
                          className="block px-4 py-2 text-sm text-white hover:bg-[#3A3A3C] w-full text-left"
                        >
                          Profile
                        </Link>
                        <Link 
                          href="/preview"
                          className="block px-4 py-2 text-sm text-white hover:bg-[#3A3A3C] w-full text-left"
                        >
                          Switch Account
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-white flex flex-col items-stretch">
          <div className="flex-1 w-full h-full">
             {children}
          </div>
        </main>
      </div>
    </DashboardContext.Provider>
  );
}
