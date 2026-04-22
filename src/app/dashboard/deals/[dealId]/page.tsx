'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { BusinessDealWorkspace } from '@/components/dashboard/screens/BusinessDealWorkspace';

export default function BusinessDealPage() {
  const params = useParams();
  const router = useRouter();
  const { accountType } = useDashboard();

  const raw = params.dealId;
  const dealId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';

  useEffect(() => {
    if (accountType === 'business') return;
    router.replace('/dashboard/deals');
  }, [accountType, router]);

  useEffect(() => {
    if (accountType !== 'business') return;
    if (!dealId) router.replace('/dashboard/deals');
  }, [accountType, dealId, router]);

  if (accountType !== 'business') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-nilink-surface text-sm text-gray-500">
        Redirecting…
      </div>
    );
  }

  if (!dealId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-nilink-surface text-sm text-gray-500">
        Redirecting…
      </div>
    );
  }

  return <BusinessDealWorkspace key={dealId} dealId={dealId} />;
}
