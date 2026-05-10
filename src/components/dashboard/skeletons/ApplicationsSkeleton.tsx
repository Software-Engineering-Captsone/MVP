'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative mb-8">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function ApplicationsSkeleton() {
  return (
    <div className="dash-main-gutter-x min-h-full animate-pulse bg-nilink-page pb-8 pt-5">
      <PageHeaderSkeleton />

      {/* tab bar */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 pb-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-16 rounded-lg bg-gray-200" />
        ))}
      </div>

      {/* application rows */}
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-3 w-32 rounded bg-gray-200" />
            </div>
            <div className="h-6 w-24 shrink-0 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
