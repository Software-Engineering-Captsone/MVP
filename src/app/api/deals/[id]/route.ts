import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import {
  dealActivityToJSON,
  dealContractToJSON,
  dealPaymentToJSON,
  dealToJSON,
  deliverableToJSON,
} from '@/lib/campaigns/serialization';
import { getDealByIdForUser } from '@/lib/campaigns/deals/repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const { id } = await context.params;
  const result = await getDealByIdForUser(id, session.id, session.role);
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  return NextResponse.json({
    deal: dealToJSON(result.deal),
    contract: result.contract ? dealContractToJSON(result.contract) : null,
    payment: result.payment ? dealPaymentToJSON(result.payment) : null,
    deliverables: result.deliverables.map(deliverableToJSON),
    activities: result.activities.map(dealActivityToJSON),
  });
}
