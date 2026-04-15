import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { createChatNegotiatedOfferDraft } from '@/lib/campaigns/repository';
import { offerToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';
import {
  assertBrandOutreachThreadForPair,
  ensureBrandOutreachThread,
} from '@/lib/chat/service';
import { fallbackEnsureOutreachThread } from '@/lib/chat/fallbackStore';
import { isChatSchemaNotReadyError } from '@/lib/chat/apiError';

/**
 * POST /api/offers/from-chat-drafts — chat lane draft (no campaign mutation).
 * Body: { athleteUserId, chatThreadId?, athleteName?, contextNote?, campaignId? }
 * When chatThreadId is omitted or invalid, a brand_outreach thread is ensured.
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

  const athleteUserId = typeof body.athleteUserId === 'string' ? body.athleteUserId.trim() : '';
  let chatThreadId = typeof body.chatThreadId === 'string' ? body.chatThreadId.trim() : '';
  const contextNote = typeof body.contextNote === 'string' ? body.contextNote : '';
  const athleteName = typeof body.athleteName === 'string' ? body.athleteName.trim() : '';
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : '';

  if (!athleteUserId) {
    return jsonError(400, 'athleteUserId is required');
  }

  if (chatThreadId === 'placeholder-thread') {
    chatThreadId = '';
  }

  try {
    if (chatThreadId) {
      const ok = await assertBrandOutreachThreadForPair(
        supabase,
        chatThreadId,
        session.id,
        athleteUserId
      );
      if (!ok) {
        return jsonError(400, 'Invalid chatThreadId for this athlete');
      }
    } else {
      const thread = await ensureBrandOutreachThread(supabase, {
        brandUserId: session.id,
        athleteUserId,
        athleteDisplayName: athleteName || undefined,
        campaignId: campaignId || null,
      });
      chatThreadId = thread.id;
    }
  } catch (e) {
    if (isChatSchemaNotReadyError(e)) {
      chatThreadId = await fallbackEnsureOutreachThread(session, athleteUserId, athleteName || undefined);
    } else {
      const msg = e instanceof Error ? e.message : 'Failed to ensure chat thread';
      return jsonError(400, msg);
    }
  }

  const result = await createChatNegotiatedOfferDraft(
    session.id,
    athleteUserId,
    chatThreadId,
    contextNote
  );

  if (!result.ok) {
    return jsonError(result.status, result.error, result.details);
  }

  const snapshot = await readLocalCampaignStore();
  return NextResponse.json({
    offer: offerToJSON(result.offer, snapshot.campaigns),
    threadId: chatThreadId,
  });
}
