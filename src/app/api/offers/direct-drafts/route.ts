import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createDirectProfileOfferDraft } from '@/lib/campaigns/repository';
import { offerToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';
import { ensureBrandOutreachThread, insertMessage } from '@/lib/chat/service';
import { fallbackAppendMessage, fallbackEnsureOutreachThread } from '@/lib/chat/fallbackStore';
import { isChatSchemaNotReadyError, mapChatInfraError } from '@/lib/chat/apiError';

/**
 * POST /api/offers/direct-drafts — brand creates an offer draft from athlete profile.
 * Body: { athleteUserId, contextNote?, athleteName? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'brand') return jsonError(403, 'Forbidden');

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

  if (!athleteUserId) {
    return jsonError(400, 'athleteUserId is required');
  }

  let offer;
  try {
    offer = await createDirectProfileOfferDraft({
      brandUserId: session.id,
      athleteUserId,
      notes: contextNote,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create offer draft';
    return jsonError(400, msg);
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
      const infra = mapChatInfraError(e);
      if (infra) return NextResponse.json(infra.body, { status: infra.status });
      const msg = e instanceof Error ? e.message : 'Failed to ensure chat thread';
      return jsonError(400, msg);
    }
  }

  const offerJson = offerToJSON(offer);

  if (offerJson.id) {
    try {
      if (usedFallbackThread) {
        await fallbackAppendMessage(
          session,
          threadId,
          'Offer draft created (direct profile). Continue in the offer wizard.',
        );
      } else {
        await insertMessage(
          supabase,
          threadId,
          session.id,
          'Offer draft created (direct profile). Continue in the offer wizard.',
          { messageKind: 'offer', offerId: offerJson.id },
        );
      }
    } catch (e) {
      console.error('Failed to post offer stub message', e);
    }
  }

  return NextResponse.json({ offer: offerJson, threadId });
}
