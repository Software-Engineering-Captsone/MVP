import { NextResponse } from 'next/server';

/**
 * DEPRECATED: Sign-in is now handled client-side via supabase.auth.signInWithPassword().
 * This route is kept to avoid 404s from any stale references.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Sign-in is now handled via Supabase Auth. Use the sign-in form directly.' },
    { status: 410 }
  );
}
