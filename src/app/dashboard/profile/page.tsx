'use client';

import { useDashboard } from '@/components/dashboard/DashboardShell';
import { ProfileEditor } from '@/components/dashboard/screens/ProfileEditor';
import { BusinessProfile } from '@/components/dashboard/screens/BusinessProfile';

export default function ProfilePage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <BusinessProfile />;
  }

  return <ProfileEditor />;
}
