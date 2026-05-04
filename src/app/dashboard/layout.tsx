import { Suspense } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { SWRProvider } from '@/components/dashboard/SWRProvider';

export const metadata = {
  title: 'Dashboard — NILINK',
  description: 'Manage your NIL deals, profile, and partnerships.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </SWRProvider>
  );
}
