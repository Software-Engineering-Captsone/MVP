import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { updatePaymentStatus } from '@/lib/campaigns/deals/supabaseRepository';
import { PAYMENT_STATUSES, type PaymentStatus } from '@/lib/campaigns/deals/types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await context.params;
  if (!paymentId) {
    return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const status = typeof body.status === 'string' ? body.status : '';
  if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) {
    return NextResponse.json({ error: `Invalid status '${status}'` }, { status: 400 });
  }

  try {
    const payment = await updatePaymentStatus(paymentId, status as PaymentStatus, {
      userId: user.userId,
      role: user.role,
    });
    return NextResponse.json({ payment });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
