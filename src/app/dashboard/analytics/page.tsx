'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { BusinessAnalytics } from '@/components/dashboard/screens/BusinessAnalytics';

export default function AnalyticsPage() {
  const { accountType } = useDashboard();
  const router = useRouter();

  useEffect(() => {
    if (accountType === 'athlete') {
      router.replace('/dashboard');
    }
  }, [accountType, router]);

  if (accountType === 'athlete') {
    return (
      <div className="flex h-full items-center justify-center bg-nilink-surface text-sm text-gray-500">
        Redirecting...
      </div>
    );
  }

  return <BusinessAnalytics />;
}
