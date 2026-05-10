'use client';

import dynamic from 'next/dynamic';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { AthleteDashboardSkeleton } from '@/components/dashboard/skeletons/AthleteDashboardSkeleton';
import { BusinessOverviewSkeleton } from '@/components/dashboard/skeletons/BusinessOverviewSkeleton';

const AthleteDashboard = dynamic(
  () => import('@/components/dashboard/screens/AthleteDashboard').then((m) => m.AthleteDashboard),
  { ssr: false, loading: () => <AthleteDashboardSkeleton /> }
);

const BusinessOverview = dynamic(
  () => import('@/components/dashboard/screens/BusinessOverview').then((m) => m.BusinessOverview),
  { ssr: false, loading: () => <BusinessOverviewSkeleton /> }
);

export default function DashboardPage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <BusinessOverview />;
  }

  return <AthleteDashboard />;
}
