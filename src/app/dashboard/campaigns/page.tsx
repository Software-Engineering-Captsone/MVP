'use client';

import dynamic from 'next/dynamic';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { CampaignsSkeleton } from '@/components/dashboard/skeletons/CampaignsSkeleton';

const AthleteCampaigns = dynamic(
  () => import('@/components/dashboard/screens/AthleteCampaigns').then((m) => m.AthleteCampaigns),
  { ssr: false, loading: () => <CampaignsSkeleton /> }
);

const BusinessCampaigns = dynamic(
  () => import('@/components/dashboard/screens/BusinessCampaigns').then((m) => m.BusinessCampaigns),
  { ssr: false, loading: () => <CampaignsSkeleton /> }
);

export default function CampaignsPage() {
  const { accountType } = useDashboard();
  if (accountType === 'business') {
    return <BusinessCampaigns />;
  }
  return <AthleteCampaigns />;
}
