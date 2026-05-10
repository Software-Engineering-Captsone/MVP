'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative mb-6">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function BusinessOverviewSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col overflow-auto bg-nilink-surface text-nilink-ink">
      {/* sticky header bar */}
      <div className="dash-main-gutter-x mb-6 shrink-0 border-b border-gray-100 py-5">
        <PageHeaderSkeleton />
      </div>

      <div className="dash-main-gutter-x relative z-20 w-full flex-1 space-y-8 pb-8">
        {/* 4-col KPI strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <div className="mb-2 h-3 w-24 rounded bg-gray-200" />
              <div className="h-9 w-16 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>

        {/* content rows */}
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="h-5 w-40 rounded bg-gray-200" />
                <div className="h-5 w-16 rounded-full bg-gray-200" />
              </div>
              <div className="mt-3 h-4 w-3/4 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
