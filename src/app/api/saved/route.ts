import { NextResponse } from 'next/server';
import {
  getSavedSnapshotForUser,
  setSavedSnapshotForUser,
} from '@/lib/saved/memorySavedRepository';
import { isValidSavedSnapshot } from '@/lib/saved/types';

/**
 * Resolves the owner of the saved list. Wire to `auth()` / session cookies when ready.
 * Keeping this in one place avoids touching every caller when auth ships.
 */
function resolveUserKey(): string {
  return 'default';
}

/**
 * GET  — load `{ athleteIds, brandIds }`
 * PUT  — replace full snapshot (same shape as body)
 *
 * Production: swap `memorySavedRepository` for a repository backed by Supabase.
 */
export async function GET() {
  const userKey = resolveUserKey();
  return NextResponse.json(getSavedSnapshotForUser(userKey));
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isValidSavedSnapshot(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const userKey = resolveUserKey();
  setSavedSnapshotForUser(userKey, body);
  return NextResponse.json(getSavedSnapshotForUser(userKey));
}
