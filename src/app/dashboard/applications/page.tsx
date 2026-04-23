'use client';

import { useDashboard } from '@/components/dashboard/DashboardShell';
import { AthleteApplications } from '@/components/dashboard/screens/AthleteApplications';

export default function ApplicationsPage() {
  const { accountType } = useDashboard();

  if (accountType !== 'athlete') {
    return (
      <div className="flex h-full items-center justify-center bg-nilink-surface text-sm text-gray-500">
        Applications tracking is available for athlete accounts only.
      </div>
    );
  }

  return <AthleteApplications />;
}
