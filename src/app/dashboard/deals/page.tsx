'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { DealsSkeleton } from '@/components/dashboard/skeletons/DealsSkeleton';
import { DealManagement } from '@/components/dashboard/screens/DealManagement';
import { BusinessDeals } from '@/components/dashboard/screens/BusinessDeals';

function DealsContent() {
  const { accountType } = useDashboard();
  const params = useSearchParams();
  const router = useRouter();
  const deal = params.get('deal');

  useEffect(() => {
    if (deal) router.replace(`/dashboard/deals/${encodeURIComponent(deal)}`);
  }, [deal, router]);

  if (deal) {
    return <DealsSkeleton />;
  }

  if (accountType === 'business') {
    return <BusinessDeals />;
  }

  return <DealManagement />;
}

export default function DealsPage() {
  return (
    <Suspense fallback={<DealsSkeleton />}>
      <DealsContent />
    </Suspense>
  );
}
