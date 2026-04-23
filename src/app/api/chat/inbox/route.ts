import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadInboxItems } from '@/lib/chat/service';

/**
 * GET /api/chat/inbox?q=<search>
 * Returns the signed-in user's chat threads, sorted by most recent activity.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? undefined;

  try {
    const items = await loadInboxItems(supabase, user.id, q);
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Chat schema not migrated',
          errorCode: 'CHAT_SCHEMA_NOT_READY',
          hint: 'Run supabase-chat-setup.sql in Supabase SQL editor.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: msg, errorCode: 'CHAT_SERVICE_UNAVAILABLE' },
      { status: 500 }
    );
  }
}
