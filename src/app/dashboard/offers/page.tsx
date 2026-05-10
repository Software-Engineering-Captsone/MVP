'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { AthleteOffers } from '@/components/dashboard/screens/AthleteOffers';
import { OffersSkeleton } from '@/components/dashboard/skeletons/OffersSkeleton';

function OffersContent() {
  const { accountType } = useDashboard();
  const params = useSearchParams();
  const offer = params.get('offer');

  if (accountType !== 'athlete') {
    return (
      <div className="flex h-full items-center justify-center bg-nilink-surface text-sm text-gray-500">
        Offers center is available for athlete accounts only.
      </div>
    );
  }

  return <AthleteOffers initialOfferId={offer} />;
}

export default function OffersPage() {
  return (
    <Suspense fallback={<OffersSkeleton />}>
      <OffersContent />
    </Suspense>
  );
}
