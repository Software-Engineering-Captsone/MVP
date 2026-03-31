import { NextResponse } from 'next/server';

/**
 * DEPRECATED: Sign-up is now handled client-side via supabase.auth.signUp().
 * This route is kept to avoid 404s from any stale references.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Sign-up is now handled via Supabase Auth. Use the sign-up form directly.' },
    { status: 410 }
  );
}
