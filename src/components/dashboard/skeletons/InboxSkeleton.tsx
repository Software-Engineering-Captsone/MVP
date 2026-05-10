'use client';

function PageHeaderSkeleton() {
  return (
    <div className="dash-page-header relative mb-4">
      <div className="h-9 w-44 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col overflow-hidden bg-nilink-surface text-nilink-ink">
      {/* header bar */}
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-3 pt-5">
        <PageHeaderSkeleton />
      </div>

      {/* filter/search bar */}
      <div className="dash-main-gutter-x flex shrink-0 flex-col gap-3 border-b border-gray-100 py-4 sm:flex-row sm:items-center">
        <div className="h-9 w-64 rounded-full bg-gray-200" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>

      {/* 2-col split */}
      <div className="dash-main-gutter-x flex min-w-0 flex-1 gap-6 overflow-hidden py-4 lg:py-6">
        {/* thread list panel */}
        <div className="flex h-full w-full shrink-0 flex-col lg:w-[320px] lg:min-w-[320px]">
          <div className="mb-3 h-5 w-32 rounded bg-gray-200" />
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-48 rounded bg-gray-200" />
                </div>
                <div className="h-3 w-10 shrink-0 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* message thread panel */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />
              <div className="space-y-1">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-3 w-20 rounded bg-gray-200" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-4">
            {[0, 1, 2].map((i) => {
              const isSent = i % 2 !== 0;
              return (
                <div key={i} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl p-3 ${isSent ? 'bg-gray-200' : 'bg-gray-100'}`}>
                    <div className={`h-3 w-48 rounded ${isSent ? 'bg-gray-400' : 'bg-gray-200'}`} />
                    <div className={`mt-1 h-3 w-32 rounded ${isSent ? 'bg-gray-400' : 'bg-gray-200'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
