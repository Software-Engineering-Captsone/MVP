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

// Define navigation structures with sections
const athleteNavigation = {
  DASHBOARD: [
    { href: '/dashboard', icon: Home, label: 'Overview' },
    { href: '/dashboard/opportunities', icon: Search, label: 'Opportunities', badge: '3' },
  ],
  REPORTS: [
    { href: '/dashboard/deals', icon: FileText, label: 'Deals' },
    { href: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  ]
};

const businessNavigation = {
  EDITOR: [
    { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
  ],
  DASHBOARD: [
    { href: '/dashboard', icon: Home, label: 'Overview' },
    { href: '/dashboard/saved', icon: Heart, label: 'Saved Athletes' },
    { href: '/dashboard/college', icon: GraduationCap, label: 'Explore College' },
  ],
  REPORTS: [
    { href: '/dashboard/deals', icon: CreditCard, label: 'Payments' },
    { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  ]
};

function NavLink({ href, icon: Icon, label, badge, currentPath }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  currentPath: string;
}) {
  const isActive = href === '/dashboard'
    ? currentPath === '/dashboard'
    : currentPath.startsWith(href);

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm font-medium ${
          isActive
            ? 'bg-[#EBF7FB] text-[#2A90B0]'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </div>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            isActive ? 'bg-white text-[#2A90B0]' : 'bg-gray-100 text-gray-500'
          }`}>
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}

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
        avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop', 
        name: 'PowerFuel Energy', 
        email: 'contact@powerfuel.com' 
      }
    : { 
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop', 
        name: 'Marcus Johnson', 
        email: 'marcus.j@stateui.edu' 
      };

  return (
    <DashboardContext.Provider value={{ accountType, setAccountType }}>
      <div className="flex h-screen bg-[#F9FAFB] text-gray-900">
        {/* Sidebar */}
        <aside 
          className="group relative w-20 hover:w-[280px] bg-white flex flex-col shadow-sm border-r border-gray-200 transition-all duration-300 ease-in-out z-50 overflow-hidden"
        >
          {/* Logo */}
          <div className="px-5 pt-6 pb-4 h-[72px] flex items-center">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-[#6CC3DA] shrink-0" fill="#6CC3DA" />
              <h1 className="text-xl font-bold tracking-tight text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                NILINK
              </h1>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 overflow-y-auto overflow-x-hidden scrollbar-hide py-4">
            {Object.entries(navigation).map(([section, items]) => (
              <div key={section} className="mb-6">
                <h3 className="px-3 mb-2 text-[10px] font-bold text-gray-400 tracking-wider uppercase h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  {section}
                </h3>
                <ul className="space-y-1">
                  {items.map((item: any) => {
                    const isActive = item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);
                      
                    return (
                      <li key={item.href + item.label}>
                        <Link
                          href={item.href}
                          className={`flex items-center px-3 py-2.5 rounded-lg transition-all text-sm font-medium relative ${
                            isActive
                              ? 'bg-[#EBF7FB] text-[#2A90B0]'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <item.icon className="w-6 h-6 shrink-0" />
                          <div className="flex items-center justify-between w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-3 whitespace-nowrap overflow-hidden">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isActive ? 'bg-white text-[#2A90B0]' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Bottom Area */}
          <div className="p-4 bg-white mt-auto">
            {/* Profile Block */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3 w-full">
                <img
                  src={userDisplay.avatar}
                  alt={userDisplay.name}
                  className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-100 shrink-0"
                />
                <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {userDisplay.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userDisplay.email}
                  </p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {isProfileMenuOpen && (
                    <>
                      {/* Invisible backdrop to close menu when clicking outside */}
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                        <Link 
                          href="/dashboard/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 w-full text-left"
                        >
                          Profile
                        </Link>
                        <Link 
                          href="/preview"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 w-full text-left"
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
