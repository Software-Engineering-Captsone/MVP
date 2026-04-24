'use client';

import { useState } from 'react';
import { InboxMockLinear } from '@/components/dashboard/screens/mocks/InboxMockLinear';
import { InboxMockIMessage } from '@/components/dashboard/screens/mocks/InboxMockIMessage';
import { InboxMockSuperhuman } from '@/components/dashboard/screens/mocks/InboxMockSuperhuman';

type Variant = 'linear' | 'imessage' | 'superhuman';

export default function MessagesPreviewPage() {
  const [variant, setVariant] = useState<Variant>('superhuman');

  return (
    <div className="flex h-screen flex-col bg-nilink-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Inbox — Design Preview</h1>
          <p className="text-xs text-gray-500">
            Mock data only. Pick the direction you want to take to production.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setVariant('superhuman')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              variant === 'superhuman' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Option C · Superhuman
          </button>
          <button
            type="button"
            onClick={() => setVariant('linear')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              variant === 'linear' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Option A · Linear-ish
          </button>
          <button
            type="button"
            onClick={() => setVariant('imessage')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              variant === 'imessage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Option B · iMessage-ish
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {variant === 'superhuman' ? (
          <InboxMockSuperhuman />
        ) : variant === 'linear' ? (
          <InboxMockLinear />
        ) : (
          <InboxMockIMessage />
        )}
      </div>
    </div>
  );
}
