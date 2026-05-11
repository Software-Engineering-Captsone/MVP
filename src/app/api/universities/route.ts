import { NextResponse } from 'next/server';

/**
 * Server-side proxy for the Hipolabs universities API.
 *
 * Why this exists:
 * - The upstream API (`http://universities.hipolabs.com`) is HTTP-only, which
 *   browsers block from HTTPS pages as mixed content (works on localhost only).
 * - Fetching server-side avoids mixed content and CORS, and lets us cache.
 *
 * Caching: 24h shared CDN cache + stale-while-revalidate so a brief upstream
 * outage doesn't break onboarding.
 */
export const runtime = 'nodejs';
export const revalidate = 86_400; // 24 hours

const UPSTREAM = 'https://universities.hipolabs.com/search?country=United+States';
// Hipolabs serves both http and https; we prefer https. If it ever drops, we
// fall back to plain http server-side (server-to-server is not blocked).
const UPSTREAM_FALLBACK = 'http://universities.hipolabs.com/search?country=United+States';

export async function GET() {
  try {
    let res = await fetch(UPSTREAM, {
      next: { revalidate: 86_400 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      res = await fetch(UPSTREAM_FALLBACK, {
        next: { revalidate: 86_400 },
        headers: { Accept: 'application/json' },
      });
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control':
          'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
