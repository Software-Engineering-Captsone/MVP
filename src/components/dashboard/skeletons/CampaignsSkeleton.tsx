'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative mb-4">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function CampaignsSkeleton() {
  return (
    <div className="flex h-full min-h-0 animate-pulse flex-col overflow-hidden bg-white text-nilink-ink">
      {/* header with stats */}
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 py-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <div className="mb-2 h-3 w-16 rounded bg-gray-200" />
              <div className="h-8 w-10 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* filter bar */}
      <div className="dash-main-gutter-x flex shrink-0 flex-col gap-3 border-b border-gray-100 py-4 sm:flex-row sm:items-center">
        <div className="h-9 w-64 rounded-full bg-gray-200" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-16 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>

      {/* campaign rows */}
      <div className="dash-main-gutter-x flex-1 space-y-3 overflow-hidden py-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="h-3 w-28 rounded bg-gray-200" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="h-6 w-20 rounded-full bg-gray-200" />
              <div className="h-4 w-4 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
