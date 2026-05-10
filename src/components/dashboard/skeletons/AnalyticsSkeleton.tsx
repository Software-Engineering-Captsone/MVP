'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="min-h-full animate-pulse bg-nilink-page">
      {/* header bar */}
      <div className="dash-main-gutter-x border-b border-gray-100 bg-white py-8">
        <PageHeaderSkeleton />
      </div>

      <div className="dash-main-gutter-x space-y-8 pb-12 pt-8">
        {/* 4-col KPI strip */}
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-2 h-3 w-24 rounded bg-gray-200" />
              <div className="flex items-center justify-between gap-2">
                <div className="h-8 w-16 rounded bg-gray-200" />
                <div className="h-8 w-16 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>

        {/* 2-col chart placeholders */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-2 h-6 w-40 rounded bg-gray-200" />
              <div className="mb-4 h-3 w-56 rounded bg-gray-200" />
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-4 w-20 rounded bg-gray-200" />
                    <div className="h-4 flex-1 rounded bg-gray-100" />
                    <div className="h-4 w-6 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
