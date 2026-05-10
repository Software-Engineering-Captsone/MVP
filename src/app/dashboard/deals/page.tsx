'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { DealsSkeleton } from '@/components/dashboard/skeletons/DealsSkeleton';

const DealManagement = dynamic(
  () => import('@/components/dashboard/screens/DealManagement').then((m) => m.DealManagement),
  { ssr: false, loading: () => <DealsSkeleton /> }
);

const BusinessDeals = dynamic(
  () => import('@/components/dashboard/screens/BusinessDeals').then((m) => m.BusinessDeals),
  { ssr: false, loading: () => <DealsSkeleton /> }
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
    <Suspense fallback={<DealsSkeleton />}>
      <DealsContent />
    </Suspense>
  );
}
