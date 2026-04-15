import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { deliverableToJSON } from '@/lib/campaigns/serialization';
import { DELIVERABLE_STATUSES, type DeliverableStatus } from '@/lib/campaigns/deals/types';
import { patchDeliverableForUser } from '@/lib/campaigns/deals/repository';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { insertMessage } from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED = new Set<string>(DELIVERABLE_STATUSES);

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

  const patch: {
    status?: DeliverableStatus;
    title?: string;
    description?: string;
  } = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.description === 'string') patch.description = body.description;
  if (typeof body.status === 'string') {
    if (!ALLOWED.has(body.status)) return jsonError(400, 'Invalid deliverable status');
    patch.status = body.status as DeliverableStatus;
  }
  if (patch.title === undefined && patch.description === undefined && patch.status === undefined) {
    return jsonError(400, 'Provide title, description, and/or status');
  }

  const result = await patchDeliverableForUser(id, session.id, session.role, patch);
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  if (session.role === 'brand' && patch.status === 'completed') {
    try {
      const snap = await readLocalCampaignStore();
      const deal = snap.deals.find((d) => String(d._id) === String(result.deliverable.dealId));
      if (deal?.chatThreadId) {
        await insertMessage(
          supabase,
          deal.chatThreadId,
          session.id,
          `Deliverable approved: ${result.deliverable.title}`,
          { messageKind: 'system' }
        );
      }
    } catch (e) {
      console.error('Failed to post deliverable-approved notification', e);
    }
  }
  return NextResponse.json({ deliverable: deliverableToJSON(result.deliverable) });
}
