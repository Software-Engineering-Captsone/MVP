import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertThreadMessagingAccess } from '@/lib/chat/threadAccess';
import { getChatSessionUser } from '@/lib/chat/session';
import { markThreadRead } from '@/lib/chat/service';
import { isChatSchemaNotReadyError, mapChatInfraError } from '@/lib/chat/apiError';
import { fallbackMarkRead } from '@/lib/chat/fallbackStore';

type RouteContext = { params: Promise<{ threadId: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
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
    await markThreadRead(supabase, threadId, session.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isChatSchemaNotReadyError(e)) {
      const ok = await fallbackMarkRead(session, threadId);
      if (!ok) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, fallback: true });
    }
    const infra = mapChatInfraError(e);
    if (infra) {
      return NextResponse.json(infra.body, { status: infra.status });
    }
    const msg = e instanceof Error ? e.message : 'Failed to mark read';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
