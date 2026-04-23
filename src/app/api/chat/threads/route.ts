import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureBrandOutreachThread } from '@/lib/chat/service';

/**
 * POST /api/chat/threads
 * Body: { kind: 'brand_outreach', athleteUserId: string, athleteDisplayName?: string, campaignId?: string|null }
 *
 * Creates or returns an outreach thread from the signed-in brand to the named athlete.
 * application_approved threads are created server-side during application approval — not via this endpoint.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const role =
    (user.app_metadata as Record<string, unknown> | undefined)?.role ??
    (user.user_metadata as Record<string, unknown> | undefined)?.role;
  if (role !== 'brand') {
    return NextResponse.json({ error: 'Only brands can start outreach threads' }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const kind = typeof payload.kind === 'string' ? payload.kind : '';
  if (kind !== 'brand_outreach') {
    return NextResponse.json({ error: 'Unsupported kind' }, { status: 400 });
  }

  const athleteUserId =
    typeof payload.athleteUserId === 'string' ? payload.athleteUserId.trim() : '';
  if (!athleteUserId) {
    return NextResponse.json({ error: 'athleteUserId is required' }, { status: 400 });
  }
  if (athleteUserId === user.id) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
  }

  const athleteDisplayName =
    typeof payload.athleteDisplayName === 'string' ? payload.athleteDisplayName : undefined;
  const campaignId =
    typeof payload.campaignId === 'string' && payload.campaignId.trim()
      ? payload.campaignId.trim()
      : null;

  try {
    const thread = await ensureBrandOutreachThread(supabase, {
      brandUserId: user.id,
      athleteUserId,
      athleteDisplayName,
      campaignId,
    });
    return NextResponse.json({ thread });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
