'use client';

import { useDashboard } from '@/components/dashboard/DashboardShell';
import { DashboardInbox } from '@/components/dashboard/screens/DashboardInbox';

export default function MessagesPage() {
  const { accountType } = useDashboard();
  return <DashboardInbox variant={accountType === 'business' ? 'business' : 'athlete'} />;
}
