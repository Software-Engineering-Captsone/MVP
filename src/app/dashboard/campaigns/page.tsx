'use client';

import { useDashboard } from '@/components/dashboard/DashboardShell';
import { AthleteCampaigns } from '@/components/dashboard/screens/AthleteCampaigns';
import { BusinessCampaigns } from '@/components/dashboard/screens/BusinessCampaigns';

export default function CampaignsPage() {
  const { accountType } = useDashboard();
  if (accountType === 'business') {
    return <BusinessCampaigns />;
  }
  return <AthleteCampaigns />;
}
