import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureBrandOutreachThread } from '@/lib/chat/service';
import { getChatSessionUser } from '@/lib/chat/session';

/**
 * POST /api/chat/threads
 * Body: { kind: 'brand_outreach', athleteUserId: string, athleteDisplayName?: string, campaignId?: string|null }
 *
 * Creates or returns an outreach thread from the signed-in brand to the named athlete.
 * application_approved threads are created server-side during application approval — not via this endpoint.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (session.role !== 'brand') {
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
  if (athleteUserId === session.id) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
  }

  const { data: athlete, error: athleteError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', athleteUserId)
    .eq('role', 'athlete')
    .not('onboarding_completed_at', 'is', null)
    .maybeSingle<{ id: string; role: string }>();
  if (athleteError) {
    return NextResponse.json({ error: athleteError.message }, { status: 500 });
  }
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const athleteDisplayName =
    typeof payload.athleteDisplayName === 'string' ? payload.athleteDisplayName : undefined;
  const campaignId =
    typeof payload.campaignId === 'string' && payload.campaignId.trim()
      ? payload.campaignId.trim()
      : null;

  try {
    const thread = await ensureBrandOutreachThread(supabase, {
      brandUserId: session.id,
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
