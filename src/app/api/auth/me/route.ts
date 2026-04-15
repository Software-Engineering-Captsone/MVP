import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveSupabaseRole } from '@/lib/auth/supabaseRole';

/**
 * GET /api/auth/me — return the current authenticated user.
 * Uses Supabase server-side session (cookie-based, no more Bearer token).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const meta = user.user_metadata ?? {};
  const role = resolveSupabaseRole({
    userMetadata: user.user_metadata as Record<string, unknown> | undefined,
    appMetadata: user.app_metadata as Record<string, unknown> | undefined,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: (meta.full_name as string) || (meta.name as string) || user.email?.split('@')[0] || 'User',
      role,
      verified: !!user.email_confirmed_at,
    },
  });
}

/**
 * PATCH /api/auth/me — update user metadata (name, role, athlete profile).
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Build the metadata update
  const metaUpdate: Record<string, unknown> = {};
  if (typeof body.name === 'string') {
    const n = body.name.trim();
    if (n.length > 0) metaUpdate.full_name = n.slice(0, 120);
  }
  if (body.athleteProfile != null) {
    metaUpdate.athlete_profile = body.athleteProfile;
  }

  const { data, error: updateError } = await supabase.auth.updateUser({
    data: metaUpdate,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const meta = data.user.user_metadata ?? {};
  const role = resolveSupabaseRole({
    userMetadata: data.user.user_metadata as Record<string, unknown> | undefined,
    appMetadata: data.user.app_metadata as Record<string, unknown> | undefined,
  });

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: (meta.full_name as string) || (meta.name as string) || data.user.email?.split('@')[0] || 'User',
      role,
      verified: !!data.user.email_confirmed_at,
      athleteProfile: meta.athlete_profile ?? undefined,
    },
  });
}
