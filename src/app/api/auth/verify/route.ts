import { NextResponse } from 'next/server';

/** DEPRECATED: Email verification now handled via Supabase Auth callback. */
export async function GET() {
  return NextResponse.json(
    { error: 'Email verification is now handled via Supabase Auth.' },
    { status: 410 }
  );
}
