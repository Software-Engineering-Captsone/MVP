'use client';

import dynamic from 'next/dynamic';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { ProfileSkeleton } from '@/components/dashboard/skeletons/ProfileSkeleton';

const ProfileEditor = dynamic(
  () => import('@/components/dashboard/screens/ProfileEditor').then((m) => m.ProfileEditor),
  { ssr: false, loading: () => <ProfileSkeleton /> }
);

const BusinessProfile = dynamic(
  () => import('@/components/dashboard/screens/BusinessProfile').then((m) => m.BusinessProfile),
  { ssr: false, loading: () => <ProfileSkeleton /> }
);

export default function ProfilePage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <BusinessProfile />;
  }

  return <ProfileEditor />;
}
