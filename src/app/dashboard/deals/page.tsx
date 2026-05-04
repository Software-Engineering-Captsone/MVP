'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';

function PageSpinner() {
  return (
    <div className="flex h-full items-center justify-center bg-nilink-surface">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-nilink-accent" />
    </div>
  );
}

const DealManagement = dynamic(
  () => import('@/components/dashboard/screens/DealManagement').then((m) => m.DealManagement),
  { ssr: false, loading: () => <PageSpinner /> }
);

const BusinessDeals = dynamic(
  () => import('@/components/dashboard/screens/BusinessDeals').then((m) => m.BusinessDeals),
  { ssr: false, loading: () => <PageSpinner /> }
);

function DealsContent() {
  const { accountType } = useDashboard();
  const params = useSearchParams();
  const deal = params.get('deal');

  if (accountType === 'business') {
    return <BusinessDeals />;
  }

  return <DealManagement initialDealId={deal} />;
}

export default function DealsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-nilink-surface text-sm text-gray-500">
          Loading deals...
        </div>
      }
    >
      <DealsContent />
    </Suspense>
  );
}
