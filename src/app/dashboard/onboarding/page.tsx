'use client';

import { AthleteOnboarding } from '@/components/dashboard/screens/onboarding/AthleteOnboarding';
import { BrandOnboarding } from '@/components/dashboard/screens/onboarding/BrandOnboarding';
import { useDashboard } from '@/components/dashboard/DashboardShell';

export default function OnboardingPage() {
  const { accountType } = useDashboard();
  if (accountType === 'business') return <BrandOnboarding />;
  return <AthleteOnboarding />;
}
