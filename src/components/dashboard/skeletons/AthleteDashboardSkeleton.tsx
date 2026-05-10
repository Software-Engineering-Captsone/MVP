'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative mb-8">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function AthleteDashboardSkeleton() {
  return (
    <div className="dash-main-gutter-x min-h-full animate-pulse bg-nilink-page pb-8 pt-5 font-sans text-nilink-ink md:pb-10 md:pt-6">
      <PageHeaderSkeleton />

      {/* 4-col stat grid */}
      <div className="mb-16 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* dark primary card */}
        <div className="relative overflow-hidden rounded-2xl bg-nilink-sidebar p-8 shadow-2xl">
          <div className="h-10 w-12 rounded bg-gray-500" />
          <div className="mt-3 h-3 w-28 rounded bg-gray-500" />
        </div>
        {/* 3 white cards */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="h-10 w-14 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-28 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* 3-col content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* left 2-col span */}
        <div className="space-y-4 lg:col-span-2">
          <div className="h-5 w-32 rounded bg-gray-200" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-200" />
                  <div className="h-3 w-32 rounded bg-gray-200" />
                </div>
                <div className="h-6 w-20 shrink-0 rounded-full bg-gray-200" />
              </div>
              <div className="mt-4 h-3 w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
        {/* right 1-col */}
        <div className="space-y-4">
          <div className="h-5 w-28 rounded bg-gray-200" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
