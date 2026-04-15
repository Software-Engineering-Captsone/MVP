'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { DealManagement } from '@/components/dashboard/screens/DealManagement';
import { BusinessDeals } from '@/components/dashboard/screens/BusinessDeals';

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
