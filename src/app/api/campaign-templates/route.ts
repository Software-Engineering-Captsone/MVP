import { NextResponse } from 'next/server';

/**
 * GET /api/campaign-templates?scope=all
 * Stub — returns an empty list. Templates UI falls through to manual entry.
 * TODO: back with a `campaign_templates` table (seed + per-org templates).
 */
export async function GET() {
  return NextResponse.json({ templates: [] });
}
