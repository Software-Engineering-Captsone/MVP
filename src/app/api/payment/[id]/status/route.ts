import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { dealPaymentToJSON, dealToJSON } from '@/lib/campaigns/serialization';
import { PAYMENT_STATUSES, type PaymentStatus } from '@/lib/campaigns/deals/types';
import { patchPaymentStatusForUser } from '@/lib/campaigns/deals/repository';

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED = new Set<string>(PAYMENT_STATUSES);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const { id: paymentId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (!status || !ALLOWED.has(status)) {
    return jsonError(400, 'Invalid payment status');
  }

  const result = await patchPaymentStatusForUser(
    paymentId,
    session.id,
    session.role,
    status as PaymentStatus
  );
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  return NextResponse.json({
    payment: dealPaymentToJSON(result.payment),
    ...(result.deal ? { deal: dealToJSON(result.deal) } : {}),
  });
}
