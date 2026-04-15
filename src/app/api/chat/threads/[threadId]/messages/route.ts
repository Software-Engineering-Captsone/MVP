import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertThreadMessagingAccess } from '@/lib/chat/threadAccess';
import { getChatSessionUser } from '@/lib/chat/session';
import { insertMessage, listMessagesForThread } from '@/lib/chat/service';
import { isChatSchemaNotReadyError, mapChatInfraError } from '@/lib/chat/apiError';
import { fallbackAppendMessage, fallbackListMessages } from '@/lib/chat/fallbackStore';

type RouteContext = { params: Promise<{ threadId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { threadId } = await context.params;
  try {
    const gate = await assertThreadMessagingAccess(supabase, threadId, session, 'read');
    if (gate.error === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (gate.error === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const messages = await listMessagesForThread(supabase, threadId);
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        fromUserId: m.fromUserId,
        body: m.body,
        createdAt: m.createdAt,
        messageKind: m.messageKind,
        offerId: m.offerId,
      })),
    });
  } catch (e) {
    if (isChatSchemaNotReadyError(e)) {
      const messages = await fallbackListMessages(session, threadId);
      if (!messages) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ messages, fallback: true });
    }
    const infra = mapChatInfraError(e);
    if (infra) {
      return NextResponse.json(infra.body, { status: infra.status });
    }
    const msg = e instanceof Error ? e.message : 'Failed to load messages';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { threadId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Message body required' }, { status: 400 });
  }

  try {
    const gate = await assertThreadMessagingAccess(supabase, threadId, session, 'write');
    if (gate.error === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (gate.error === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const created = await insertMessage(supabase, threadId, session.id, text);
    return NextResponse.json({
      message: {
        id: created.id,
        fromUserId: created.fromUserId,
        body: created.body,
        createdAt: created.createdAt,
        messageKind: created.messageKind,
        offerId: created.offerId,
      },
    });
  } catch (e) {
    if (isChatSchemaNotReadyError(e)) {
      const created = await fallbackAppendMessage(session, threadId, text);
      if (!created) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ message: created, fallback: true });
    }
    const infra = mapChatInfraError(e);
    if (infra) {
      return NextResponse.json(infra.body, { status: infra.status });
    }
    const msg = e instanceof Error ? e.message : 'Failed to send';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
