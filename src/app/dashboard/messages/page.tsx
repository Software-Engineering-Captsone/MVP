'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { DashboardInbox } from '@/components/dashboard/screens/DashboardInbox';
import { InboxSkeleton } from '@/components/dashboard/skeletons/InboxSkeleton';

function MessagesInbox() {
  const { accountType } = useDashboard();
  const searchParams = useSearchParams();
  const thread = searchParams.get('thread');
  const application = searchParams.get('application');

  return (
    <DashboardInbox
      variant={accountType === 'business' ? 'business' : 'athlete'}
      initialThreadId={thread}
      initialApplicationId={thread ? null : application}
    />
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <MessagesInbox />
    </Suspense>
  );
}
