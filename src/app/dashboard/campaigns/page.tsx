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

const AthleteCampaigns = dynamic(
  () => import('@/components/dashboard/screens/AthleteCampaigns').then((m) => m.AthleteCampaigns),
  { ssr: false, loading: () => <PageSpinner /> }
);

const BusinessCampaigns = dynamic(
  () => import('@/components/dashboard/screens/BusinessCampaigns').then((m) => m.BusinessCampaigns),
  { ssr: false, loading: () => <PageSpinner /> }
);

export default function CampaignsPage() {
  const { accountType } = useDashboard();
  if (accountType === 'business') {
    return <BusinessCampaigns />;
  }
  return <AthleteCampaigns />;
}
