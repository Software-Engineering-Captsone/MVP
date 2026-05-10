'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative mb-8">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="dash-main-gutter-x min-h-full animate-pulse bg-nilink-page pb-12 pt-5">
      <PageHeaderSkeleton />

      {/* banner + avatar card */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="h-28 w-full bg-gray-200" />
        <div className="px-6 pb-6 pt-0">
          <div className="-mt-10 mb-4 h-20 w-20 rounded-full border-4 border-white bg-gray-300" />
          <div className="h-5 w-40 rounded bg-gray-200" />
          <div className="mt-2 h-3 w-28 rounded bg-gray-200" />
        </div>
      </div>

      {/* section cards */}
      <div className="space-y-6">
        {[4, 6, 5, 4].map((rows, section) => (
          <div key={section} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 space-y-1">
              <div className="h-6 w-36 rounded bg-gray-200" />
              <div className="h-3 w-48 rounded bg-gray-200" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-10 w-full rounded-xl bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
