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

const ProfileEditor = dynamic(
  () => import('@/components/dashboard/screens/ProfileEditor').then((m) => m.ProfileEditor),
  { ssr: false, loading: () => <PageSpinner /> }
);

const BusinessProfile = dynamic(
  () => import('@/components/dashboard/screens/BusinessProfile').then((m) => m.BusinessProfile),
  { ssr: false, loading: () => <PageSpinner /> }
);

export default function ProfilePage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <BusinessProfile />;
  }

  return <ProfileEditor />;
}
