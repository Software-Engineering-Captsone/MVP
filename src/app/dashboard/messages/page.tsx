'use client';

import { useDashboard } from '@/components/dashboard/DashboardShell';
import { Messaging } from '@/components/dashboard/screens/Messaging';
import { BusinessMessages } from '@/components/dashboard/screens/BusinessMessages';

export default function MessagesPage() {
  const { accountType } = useDashboard();

  if (accountType === 'business') {
    return <BusinessMessages />;
  }

  return <Messaging />;
}
