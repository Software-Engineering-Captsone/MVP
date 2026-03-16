'use client';

import { useDashboard } from '@/components/dashboard/DashboardShell';
import { DealManagement } from '@/components/dashboard/screens/DealManagement';
import { BusinessDeals } from '@/components/dashboard/screens/BusinessDeals';

export default function DealsPage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <BusinessDeals />;
  }

  return <DealManagement />;
}
