'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client (singleton per tab).
 * Uses cookies managed by the SSR helper so the session is
 * shared between client components and the Next.js middleware / server.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
