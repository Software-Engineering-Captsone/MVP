import { Suspense } from 'react';
import OnboardingShell from '@/components/onboarding/OnboardingShell';

export const metadata = {
  title: 'Get Started — NILINK',
  description: 'Set up your NIL-ready athlete profile in a few simple steps.',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-nilink-page">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <OnboardingShell>{children}</OnboardingShell>
    </Suspense>
  );
}
