import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createReferralApplication } from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/campaigns/[id]/referrals — brand invites an athlete to a campaign.
 * Creates a `pending` application row idempotently per (campaign, athlete).
 * Body: { athleteUserId, inviteNote?, origin? } — inviteNote/origin accepted
 * for client compatibility but not persisted under the current schema.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'brand') return jsonError(403, 'Forbidden');

  const { id: campaignId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const athleteUserId =
    typeof body.athleteUserId === 'string' ? body.athleteUserId.trim() : '';

  const result = await createReferralApplication({
    campaignId,
    brandUserId: session.id,
    athleteUserId,
  });

  if (!result.ok) {
    return jsonError(result.status, result.error);
  }

  return NextResponse.json(
    {
      campaignId,
      application: applicationToJSON(result.application),
      created: result.created,
    },
    { status: result.created ? 201 : 200 },
  );
}
