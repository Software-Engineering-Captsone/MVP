import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createReferralInviteApplication } from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/campaigns/[id]/referrals — brand invites an athlete via referral application lane.
 * Idempotent per (campaignId, athleteUserId) while the campaign accepts applications.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  if (session.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  const { id: campaignId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const athleteUserId =
    typeof body.athleteUserId === 'string' ? body.athleteUserId.trim() : '';
  const inviteNote = typeof body.inviteNote === 'string' ? body.inviteNote : '';
  const origin =
    body.origin === 'profile' || body.origin === 'chat' || body.origin === 'manual'
      ? body.origin
      : 'manual';

  const result = await createReferralInviteApplication(
    campaignId,
    session.id,
    athleteUserId,
    inviteNote,
    origin
  );

  if (!result.ok) {
    return jsonError(result.status, result.error, result.details);
  }

  return NextResponse.json(
    {
      campaignId,
      application: applicationToJSON(result.application),
      created: result.created,
    },
    { status: result.created ? 201 : 200 }
  );
}
