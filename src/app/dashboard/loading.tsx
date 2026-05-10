'use client';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { AthleteDashboardSkeleton } from '@/components/dashboard/skeletons/AthleteDashboardSkeleton';
import { BusinessOverviewSkeleton } from '@/components/dashboard/skeletons/BusinessOverviewSkeleton';

export default function DashboardLoading() {
  const { accountType } = useDashboard();
  return accountType === 'business' ? <BusinessOverviewSkeleton /> : <AthleteDashboardSkeleton />;
}
