import { NextResponse } from 'next/server';

/** DEPRECATED: Resend verification now handled via supabase.auth.resend(). */
export async function POST() {
  return NextResponse.json(
    { error: 'Resend verification is now handled via Supabase Auth.' },
    { status: 410 }
  );
}
