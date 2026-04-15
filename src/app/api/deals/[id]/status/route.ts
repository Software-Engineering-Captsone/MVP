import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { dealToJSON } from '@/lib/campaigns/serialization';
import { DEAL_STATUSES, type DealStatus } from '@/lib/campaigns/deals/types';
import { patchDealStatusForUser } from '@/lib/campaigns/deals/repository';
import { insertMessage } from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED = new Set<string>(DEAL_STATUSES);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (!status || !ALLOWED.has(status)) {
    return jsonError(400, 'Invalid deal status');
  }

  const result = await patchDealStatusForUser(id, session.id, session.role, status as DealStatus);
  if (!result.ok) {
    return jsonError(result.status, result.error, result.details);
  }
  if (session.role === 'brand' && result.deal.chatThreadId) {
    try {
      const statusText = String(status);
      let body = '';
      if (statusText === 'closed') {
        body = 'Deal completed. Thanks for collaborating!';
      } else if (statusText === 'approved_completed') {
        body = 'All deliverables approved. Payment processing will start soon.';
      } else if (statusText === 'paid') {
        body = 'Payment has been marked as paid.';
      }
      if (body) {
        await insertMessage(supabase, result.deal.chatThreadId, session.id, body, {
          messageKind: 'system',
        });
      }
    } catch (e) {
      console.error('Failed to post deal status notification', e);
    }
  }
  return NextResponse.json({ deal: dealToJSON(result.deal) });
}
