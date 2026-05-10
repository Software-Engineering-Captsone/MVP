'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { BusinessDealWorkspace } from '@/components/dashboard/screens/BusinessDealWorkspace';
import { AthleteDealWorkspace } from '@/components/dashboard/screens/AthleteDealWorkspace';

export default function BusinessDealPage() {
  const params = useParams();
  const router = useRouter();
  const { accountType } = useDashboard();

  const raw = params.dealId;
  const dealId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';

  useEffect(() => {
    if (!dealId) router.replace('/dashboard/deals');
  }, [dealId, router]);

  if (!dealId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-nilink-surface text-sm text-gray-500">
        Redirecting…
      </div>
    );
  }

  if (accountType === 'business') {
    return <BusinessDealWorkspace key={dealId} dealId={dealId} />;
  }

  return <AthleteDealWorkspace key={dealId} dealId={dealId} />;
}
