'use client';

import dynamic from 'next/dynamic';
import { useDashboard } from '@/components/dashboard/DashboardShell';

function PageSpinner() {
  return (
    <div className="flex h-full items-center justify-center bg-nilink-surface">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-nilink-accent" />
    </div>
  );
}

const AthleteDashboard = dynamic(
  () => import('@/components/dashboard/screens/AthleteDashboard').then((m) => m.AthleteDashboard),
  { ssr: false, loading: () => <PageSpinner /> }
);

const BusinessOverview = dynamic(
  () => import('@/components/dashboard/screens/BusinessOverview').then((m) => m.BusinessOverview),
  { ssr: false, loading: () => <PageSpinner /> }
);

export default function DashboardPage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <BusinessOverview />;
  }

  return <AthleteDashboard />;
}
