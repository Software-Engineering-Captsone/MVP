'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative mb-4">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function DealsSkeleton() {
  return (
    <div className="flex h-full min-h-full animate-pulse flex-col bg-nilink-page font-sans text-nilink-ink">
      {/* header with stat strip */}
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white py-8">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* dark card */}
          <div className="relative overflow-hidden rounded-2xl bg-nilink-sidebar p-6 shadow-xl">
            <div className="h-3 w-28 rounded bg-gray-500" />
            <div className="mt-3 h-10 w-24 rounded bg-gray-500" />
          </div>
          {/* 2 white cards */}
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="h-3 w-20 rounded bg-gray-200" />
              <div className="mt-3 h-10 w-12 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* tab row */}
      <div className="dash-main-gutter-x flex gap-2 pb-2 pt-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-gray-200" />
        ))}
      </div>

      {/* deal rows */}
      <div className="dash-main-gutter-x flex-1 space-y-3 overflow-hidden py-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-gray-200" />
                <div className="h-3 w-32 rounded bg-gray-200" />
              </div>
              <div className="h-6 w-20 shrink-0 rounded-full bg-gray-200" />
            </div>
            <div className="mt-3 flex gap-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-5 w-5 rounded-full bg-gray-200" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
