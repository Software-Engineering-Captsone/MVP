import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/jsonError';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { getAthleteProfile } from '@/lib/athletes/profileRepository';

/**
 * Public-facing athlete profile aggregate.
 *
 * Auth required (any signed-in role). Brand-side dashboard fetches an athlete
 * profile to drive the AthleteProfile screen; athletes can view their own page
 * via the same endpoint while we transition off mock data.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');

  const { id } = await ctx.params;
  if (!id || typeof id !== 'string') return jsonError(400, 'Missing athlete id');

  try {
    const athlete = await getAthleteProfile(id);
    if (!athlete) return jsonError(404, 'Athlete not found');
    return NextResponse.json({ athlete });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load athlete profile';
    return jsonError(500, msg);
  }
}

export const dynamic = 'force-dynamic';
