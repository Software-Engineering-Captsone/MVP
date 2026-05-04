import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { updateDealStatus } from '@/lib/campaigns/deals/supabaseRepository';
import { DEAL_STATUSES, type DealStatus } from '@/lib/campaigns/deals/types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ dealId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dealId } = await context.params;
  if (!dealId) {
    return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const status = typeof body.status === 'string' ? body.status : '';
  if (!DEAL_STATUSES.includes(status as DealStatus)) {
    return NextResponse.json({ error: `Invalid status '${status}'` }, { status: 400 });
  }

  try {
    const deal = await updateDealStatus(dealId, status as DealStatus, {
      userId: user.userId,
      role: user.role,
    });
    return NextResponse.json({ deal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Deal not found' ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
