import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { requestDealCancellation, respondToCancellationRequest } from '@/lib/campaigns/deals/supabaseRepository';

type RouteContext = { params: Promise<{ dealId: string }> };

/** Brand or athlete: request deal cancellation. Body: { reason: string } */
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dealId } = await context.params;
  if (!dealId) return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });

  let body: { reason?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : '';
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 });

  try {
    const deal = await requestDealCancellation(dealId, reason, { userId: user.userId, role: user.role });
    return NextResponse.json({ deal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Deal not found' ? 404 : msg === 'Forbidden' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

/** Counter-party: respond to cancellation request. Body: { response: 'accept' | 'dispute' } */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dealId } = await context.params;
  if (!dealId) return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });

  let body: { response?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const response = body.response;
  if (response !== 'accept' && response !== 'dispute') {
    return NextResponse.json({ error: "response must be 'accept' or 'dispute'" }, { status: 400 });
  }

  try {
    const deal = await respondToCancellationRequest(dealId, response, { userId: user.userId, role: user.role });
    return NextResponse.json({ deal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Deal not found' ? 404 : msg === 'Forbidden' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
