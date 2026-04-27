import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { findUserById } from '@/lib/auth/localUserRepository';
import { ensureBrandOutreachThread, insertMessage } from '@/lib/chat/service';
import { isChatSchemaNotReadyError, mapChatInfraError } from '@/lib/chat/apiError';
import { fallbackAppendMessage, fallbackEnsureOutreachThread } from '@/lib/chat/fallbackStore';

/**
 * POST /api/chat/outreach — brand-only; creates or returns a brand_outreach thread.
 * Body: { athleteUserId, athleteName?, initialMessage?, campaignId? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const athleteUserId = typeof body.athleteUserId === 'string' ? body.athleteUserId.trim() : '';
  if (!athleteUserId) {
    return NextResponse.json({ error: 'athleteUserId is required' }, { status: 400 });
  }

  const athlete = await findUserById(athleteUserId);
  if (!athlete || athlete.role !== 'athlete') {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const athleteName = typeof body.athleteName === 'string' ? body.athleteName.trim() : '';
  const initialMessage =
    typeof body.initialMessage === 'string' ? body.initialMessage.trim() : '';
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : '';

  try {
    const thread = await ensureBrandOutreachThread(supabase, {
      brandUserId: session.id,
      athleteUserId,
      athleteDisplayName: athleteName || undefined,
      campaignId: campaignId || null,
    });

    if (initialMessage) {
      await insertMessage(supabase, thread.id, session.id, initialMessage);
    }

    return NextResponse.json({ threadId: thread.id });
  } catch (e) {
    if (isChatSchemaNotReadyError(e)) {
      const threadId = await fallbackEnsureOutreachThread(session, athleteUserId, athleteName || undefined);
      if (initialMessage) {
        await fallbackAppendMessage(session, threadId, initialMessage);
      }
      return NextResponse.json({ threadId, fallback: true });
    }
    const infra = mapChatInfraError(e);
    if (infra) {
      return NextResponse.json(infra.body, { status: infra.status });
    }
    const msg = e instanceof Error ? e.message : 'Failed to create outreach thread';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
