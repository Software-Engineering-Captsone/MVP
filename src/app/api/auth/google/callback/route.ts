import { NextResponse } from 'next/server';

/** DEPRECATED: Google OAuth callback now handled via /auth/callback route. */
export async function GET() {
  return NextResponse.json(
    { error: 'Google OAuth callback is now handled via Supabase Auth.' },
    { status: 410 }
  );
}
