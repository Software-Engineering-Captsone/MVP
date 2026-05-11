import { NextResponse } from 'next/server';
import { UNIVERSITIES_FALLBACK } from '@/lib/universitiesFallback';

/**
 * Server-side proxy for the Hipolabs universities API.
 *
 * Why this exists:
 * - The upstream API (`http://universities.hipolabs.com`) is HTTP-only, which
 *   browsers block from HTTPS pages as mixed content.
 * - Fetching server-side avoids mixed content and CORS, and lets us cache.
 * - Upstream has intermittent 502s, especially from Vercel serverless regions.
 *   When upstream fails, we return a curated fallback list (sorted, ~230
 *   schools covering Power-5, Ivy, top D1/D2, HBCUs, and NESCAC) so the
 *   onboarding dropdown is never empty.
 *
 * Cache: 24h shared CDN cache + 7d stale-while-revalidate.
 */
export const runtime = 'nodejs';
export const revalidate = 86_400; // 24 hours

const UPSTREAM_HTTPS = 'https://universities.hipolabs.com/search?country=United+States';
const UPSTREAM_HTTP = 'http://universities.hipolabs.com/search?country=United+States';

// Some upstreams reject the default `node` user-agent. Identify as a browser
// while keeping a contact hint so admins can reach us.
const UA =
  'Mozilla/5.0 (compatible; NILINKBot/1.0; +https://nilink.app/contact) Chrome/120 Safari/537.36';

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': UA },
      next: { revalidate: 86_400 },
    });
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  // Try HTTPS upstream first, then HTTP (server-to-server is not mixed-content
  // restricted). Either failure mode falls back to the bundled list so the UX
  // is unaffected.
  for (const url of [UPSTREAM_HTTPS, UPSTREAM_HTTP]) {
    try {
      const res = await fetchWithTimeout(url, 8_000);
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
          'x-universities-source': 'upstream',
        },
      });
    } catch {
      // try next URL, then fall through to fallback
    }
  }

  // Upstream unreachable → serve the curated fallback. Still 200 OK so the
  // client treats it as a successful list (just smaller).
  return NextResponse.json(UNIVERSITIES_FALLBACK, {
    headers: {
      // Short cache for fallback so we retry upstream sooner next time.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      'x-universities-source': 'fallback',
    },
  });
}
