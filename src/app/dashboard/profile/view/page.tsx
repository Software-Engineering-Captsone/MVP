'use client';

import { useSearchParams } from 'next/navigation';
import { AthleteProfile } from '@/components/dashboard/screens/AthleteProfile';
import { ProfileView } from '@/components/dashboard/screens/ProfileView';

export default function ProfileViewPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (id) {
    return <AthleteProfile />;
  }

  return <ProfileView />;
}
