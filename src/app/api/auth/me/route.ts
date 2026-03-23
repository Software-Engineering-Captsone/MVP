import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { mergeAthleteProfile, sanitizeAthleteProfilePatch } from '@/lib/auth/athleteProfile';
import { findUserById, updateLocalUser, type UserPatch } from '@/lib/auth/localUserRepository';

function userJson(fullUser: NonNullable<Awaited<ReturnType<typeof findUserById>>>) {
  return {
    id: fullUser._id,
    email: fullUser.email,
    name: fullUser.name,
    role: fullUser.role,
    verified: fullUser.verified,
    athleteProfile:
      fullUser.role === 'athlete' ? mergeAthleteProfile(fullUser.athleteProfile) : undefined,
  };
}

async function getHandler(_request: NextRequest, user: { userId: string }) {
  const fullUser = await findUserById(user.userId);

  if (!fullUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: userJson(fullUser) });
}

async function patchHandler(request: NextRequest, user: { userId: string }) {
  const fullUser = await findUserById(user.userId);
  if (!fullUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: UserPatch = {};
  if (typeof body.name === 'string') {
    const n = body.name.trim();
    if (n.length > 0) patch.name = n.slice(0, 120);
  }
  if (fullUser.role === 'athlete' && body.athleteProfile != null) {
    patch.athleteProfile = sanitizeAthleteProfilePatch(body.athleteProfile);
  }

  const updated = await updateLocalUser(user.userId, patch);
  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ user: userJson(updated) });
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
