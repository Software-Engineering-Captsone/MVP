'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { DashboardInbox } from '@/components/dashboard/screens/DashboardInbox';

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
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-nilink-surface text-sm text-gray-500">
          Loading inbox…
        </div>
      }
    >
      <MessagesInbox />
    </Suspense>
  );
}
