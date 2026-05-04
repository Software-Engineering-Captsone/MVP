import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { getDealDetailForCurrentUser } from '@/lib/campaigns/deals/supabaseRepository';

export async function GET(
  _request: NextRequest,
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

  try {
    const detail = await getDealDetailForCurrentUser(dealId);
    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
