import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { createDirectProfileOfferDraft } from '@/lib/campaigns/repository';
import { offerToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';
import { ensureBrandOutreachThread, insertMessage } from '@/lib/chat/service';
import { fallbackAppendMessage, fallbackEnsureOutreachThread } from '@/lib/chat/fallbackStore';
import { isChatSchemaNotReadyError } from '@/lib/chat/apiError';

/**
 * POST /api/offers/direct-drafts — brand creates an offer draft from athlete profile (no campaign lane).
 * Body: { athleteUserId, contextNote?, athleteName? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  if (session.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const athleteUserId =
    typeof body.athleteUserId === 'string' ? body.athleteUserId.trim() : '';
  const contextNote = typeof body.contextNote === 'string' ? body.contextNote : '';
  const athleteName = typeof body.athleteName === 'string' ? body.athleteName.trim() : '';

  const result = await createDirectProfileOfferDraft(session.id, athleteUserId, contextNote);
  if (!result.ok) {
    return jsonError(result.status, result.error, result.details);
  }

  let threadId: string;
  let usedFallbackThread = false;
  try {
    const thread = await ensureBrandOutreachThread(supabase, {
      brandUserId: session.id,
      athleteUserId,
      athleteDisplayName: athleteName || undefined,
    });
    threadId = thread.id;
  } catch (e) {
    if (isChatSchemaNotReadyError(e)) {
      threadId = await fallbackEnsureOutreachThread(session, athleteUserId, athleteName || undefined);
      usedFallbackThread = true;
    } else {
      const msg = e instanceof Error ? e.message : 'Failed to ensure chat thread';
      return jsonError(400, msg);
    }
  }

  const snapshot = await readLocalCampaignStore();
  const offerJson = offerToJSON(result.offer, snapshot.campaigns);

  if (offerJson.id) {
    try {
      if (usedFallbackThread) {
        await fallbackAppendMessage(
          session,
          threadId,
          'Offer draft created (direct profile). Continue in the offer wizard.'
        );
      } else {
        await insertMessage(
          supabase,
          threadId,
          session.id,
          'Offer draft created (direct profile). Continue in the offer wizard.',
          { messageKind: 'offer', offerId: offerJson.id }
        );
      }
    } catch (e) {
      console.error('Failed to post offer stub message', e);
    }
  }

  return NextResponse.json({
    offer: offerJson,
    threadId,
  });
}
