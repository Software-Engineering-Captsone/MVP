'use client';

/**
 * Fetch wrapper for authenticated API calls.
 *
 * With Supabase, the session token is stored in cookies (managed by @supabase/ssr),
 * so we no longer need to manually attach a Bearer token.
 * The cookies are automatically sent with every same-origin fetch request.
 *
 * This wrapper is kept for backward compatibility with existing code that
 * calls authFetch() — it now just passes through to regular fetch.
 */
export function getAuthHeaders(): HeadersInit {
  return {};
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string>),
    },
  });
}
