'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function OffersSkeleton() {
  return (
    <div className="flex h-full min-h-full animate-pulse flex-col bg-nilink-page text-nilink-ink">
      {/* header bar */}
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 bg-white py-8">
        <PageHeaderSkeleton />
      </div>

      {/* 2-col split */}
      <div className="dash-main-gutter-x flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
        {/* left: offer list */}
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
          <div className="divide-y divide-gray-100">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-gray-200" />
                    <div className="h-3 w-24 rounded bg-gray-200" />
                  </div>
                  <div className="h-5 w-16 shrink-0 rounded-full bg-gray-200" />
                </div>
                <div className="mt-2 h-3 w-full rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>

        {/* right: detail panel */}
        <div className="min-w-0 flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-12 rounded bg-gray-200" />
              <div className="h-7 w-48 rounded bg-gray-200" />
              <div className="h-3 w-32 rounded bg-gray-200" />
            </div>
            <div className="h-6 w-20 shrink-0 rounded-full bg-gray-200" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-4">
                <div className="h-3 w-20 rounded bg-gray-200" />
                <div className="mt-2 h-5 w-28 rounded bg-gray-200" />
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-4">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-3 w-5/6 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
