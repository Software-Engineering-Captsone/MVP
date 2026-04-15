import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadInboxItems } from '@/lib/chat/service';
import { filterAthleteInboxItems } from '@/lib/chat/messagingEligibility';
import { getChatSessionUser } from '@/lib/chat/session';
import { isChatSchemaNotReadyError, mapChatInfraError } from '@/lib/chat/apiError';
import { fallbackLoadInbox } from '@/lib/chat/fallbackStore';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q') ?? undefined;

  try {
    const raw = await loadInboxItems(supabase, session.id, q);
    const items =
      session.role === 'athlete'
        ? await filterAthleteInboxItems(supabase, session, raw)
        : raw;
    return NextResponse.json({ items });
  } catch (e) {
    if (isChatSchemaNotReadyError(e)) {
      const items = await fallbackLoadInbox(session, q);
      return NextResponse.json({ items, fallback: true });
    }
    const infra = mapChatInfraError(e);
    if (infra) {
      return NextResponse.json(infra.body, { status: infra.status });
    }
    const msg = e instanceof Error ? e.message : 'Failed to load inbox';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
