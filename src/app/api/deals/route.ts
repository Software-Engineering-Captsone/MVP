import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { listDealsForCurrentUser } from '@/lib/campaigns/deals/supabaseRepository';
import { DEAL_STATUSES } from '@/lib/campaigns/deals/types';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status') ?? undefined;
  const trimmedStatus = typeof status === 'string' ? status.trim() : '';
  if (trimmedStatus && !DEAL_STATUSES.includes(trimmedStatus as (typeof DEAL_STATUSES)[number])) {
    return NextResponse.json({ error: 'Invalid deal status' }, { status: 400 });
  }

  try {
    const deals = await listDealsForCurrentUser(trimmedStatus || undefined);
    return NextResponse.json({ deals });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
