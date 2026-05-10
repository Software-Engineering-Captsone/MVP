'use client';
import { OpportunityExploreCardPlaceholder } from '@/components/dashboard/cards/OpportunityExploreCard';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative mb-8 animate-pulse">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function DiscoverySkeleton() {
  return (
    <div className="dash-main-gutter-x min-h-full bg-nilink-page pb-8 pt-5">
      <PageHeaderSkeleton />

      {/* search + filter bar */}
      <div className="mb-6 flex animate-pulse flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-10 w-full max-w-sm rounded-full bg-gray-200" />
        <div className="flex gap-2 overflow-x-auto">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>

      {/* card grid — OpportunityExploreCardPlaceholder includes opportunityCardTokens.root (p-4, rounded-3xl, border) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <OpportunityExploreCardPlaceholder key={i} />
        ))}
      </div>
    </div>
  );
}
