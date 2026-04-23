import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getThreadById, markThreadRead } from '@/lib/chat/service';

type RouteCtx = { params: Promise<{ threadId: string }> };

/**
 * POST /api/chat/threads/:threadId/read
 * Marks the thread as read by the signed-in user (upserts last_read_at=now).
 */
export async function POST(_request: Request, ctx: RouteCtx) {
  const { threadId } = await ctx.params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const thread = await getThreadById(supabase, threadId);
  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  if (user.id !== thread.brand_user_id && user.id !== thread.athlete_user_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await markThreadRead(supabase, threadId, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
