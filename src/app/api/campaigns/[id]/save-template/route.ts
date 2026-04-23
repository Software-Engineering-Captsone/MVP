import { NextResponse } from 'next/server';

/**
 * POST /api/campaigns/:id/save-template
 * Stub — accepts the request and reports success without persisting.
 * TODO: insert into `campaign_templates` (per brand/org).
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
