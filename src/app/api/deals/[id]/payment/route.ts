import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { dealPaymentToJSON } from '@/lib/campaigns/serialization';
import { getPaymentForDealForUser } from '@/lib/campaigns/deals/repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const { id: dealId } = await context.params;
  const result = await getPaymentForDealForUser(dealId, session.id, session.role);
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  return NextResponse.json({ payment: dealPaymentToJSON(result.payment) });
}
