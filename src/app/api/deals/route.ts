import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { dealToJSON } from '@/lib/campaigns/serialization';
import { isAuthorizedDealsSystemCaller } from '@/lib/campaigns/deals/systemAuth';
import { listDealsForUser, systemMaterializeDealFromSentOffer } from '@/lib/campaigns/deals/repository';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const status = request.nextUrl.searchParams.get('status') ?? undefined;
  const deals = await listDealsForUser(session.id, session.role, status ?? undefined);
  return NextResponse.json({ deals: deals.map(dealToJSON) });
}

/**
 * POST /api/deals — system worker only (materializes acceptance + deal from a sent offer).
 */
export async function POST(request: NextRequest) {
  const hdr = request.headers.get('x-mvp-deals-system-key');
  if (!isAuthorizedDealsSystemCaller(hdr)) {
    return jsonError(403, 'Forbidden');
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }
  const offerId = typeof body.offerId === 'string' ? body.offerId.trim() : '';
  if (!offerId) return jsonError(400, 'offerId is required');

  const result = await systemMaterializeDealFromSentOffer(offerId);
  if (!result.ok) {
    return jsonError(result.status, result.error, result.details);
  }
  return NextResponse.json({ deal: dealToJSON(result.deal) }, { status: 201 });
}
