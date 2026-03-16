'use client';

import { useDashboard } from '@/components/dashboard/DashboardShell';
import { AthleteDashboard } from '@/components/dashboard/screens/AthleteDashboard';
import { Research } from '@/components/dashboard/screens/Research';

export default function DashboardPage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <Research />;
  }

  return <AthleteDashboard />;
}