import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getThreadById, insertMessage, listMessagesForThread } from '@/lib/chat/service';

type RouteCtx = { params: Promise<{ threadId: string }> };

async function authorize(threadId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated' as const, status: 401 };

  const thread = await getThreadById(supabase, threadId);
  if (!thread) return { error: 'Thread not found' as const, status: 404 };
  if (user.id !== thread.brand_user_id && user.id !== thread.athlete_user_id) {
    return { error: 'Forbidden' as const, status: 403 };
  }
  return { supabase, userId: user.id, thread };
}

/**
 * GET /api/chat/threads/:threadId/messages
 * Returns the full message history for a thread, oldest first.
 */
export async function GET(_request: Request, ctx: RouteCtx) {
  const { threadId } = await ctx.params;
  const auth = await authorize(threadId);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const messages = await listMessagesForThread(auth.supabase, threadId);
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/threads/:threadId/messages
 * Body: { body: string }
 * Inserts a user message authored by the signed-in participant.
 */
export async function POST(request: Request, ctx: RouteCtx) {
  const { threadId } = await ctx.params;
  const auth = await authorize(threadId);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const body =
    payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).body === 'string'
      ? ((payload as Record<string, unknown>).body as string).trim()
      : '';

  if (!body) return NextResponse.json({ error: 'body is required' }, { status: 400 });
  if (body.length > 5000) return NextResponse.json({ error: 'Message too long' }, { status: 400 });

  try {
    const message = await insertMessage(auth.supabase, threadId, auth.userId, body);
    return NextResponse.json({ message });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
