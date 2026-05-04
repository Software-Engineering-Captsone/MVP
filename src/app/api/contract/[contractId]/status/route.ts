import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { updateContractStatus } from '@/lib/campaigns/deals/supabaseRepository';
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/campaigns/deals/types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ contractId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contractId } = await context.params;
  if (!contractId) {
    return NextResponse.json({ error: 'Missing contractId' }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const status = typeof body.status === 'string' ? body.status : '';
  if (!CONTRACT_STATUSES.includes(status as ContractStatus)) {
    return NextResponse.json({ error: `Invalid status '${status}'` }, { status: 400 });
  }

  try {
    const contract = await updateContractStatus(contractId, status as ContractStatus);
    return NextResponse.json({ contract });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
