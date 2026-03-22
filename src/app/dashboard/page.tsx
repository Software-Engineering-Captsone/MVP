'use client';

import { useDashboard } from '@/components/dashboard/DashboardShell';
import { AthleteDashboard } from '@/components/dashboard/screens/AthleteDashboard';
import { BusinessOverview } from '@/components/dashboard/screens/BusinessOverview';

export default function DashboardPage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <BusinessOverview />;
  }

  return <AthleteDashboard />;
}