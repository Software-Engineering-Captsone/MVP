import { NextResponse } from 'next/server';

/**
 * GET /api/campaigns/:id/match-preview
 * Stub — returns an empty preview so the wizard UX doesn't error.
 * TODO: compute matches from athlete pool against campaign filters.
 */
export async function GET() {
  return NextResponse.json({ matches: [], summary: { total: 0 } });
}
