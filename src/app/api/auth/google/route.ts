import { NextResponse } from 'next/server';

/** DEPRECATED: Google OAuth now handled via supabase.auth.signInWithOAuth(). */
export async function GET() {
  return NextResponse.json(
    { error: 'Google OAuth is now handled via Supabase Auth.' },
    { status: 410 }
  );
}
