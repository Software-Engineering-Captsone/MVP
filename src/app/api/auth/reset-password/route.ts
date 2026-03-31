import { NextResponse } from 'next/server';

/** DEPRECATED: Password reset now handled via supabase.auth.updateUser(). */
export async function POST() {
  return NextResponse.json(
    { error: 'Password reset is now handled via Supabase Auth.' },
    { status: 410 }
  );
}
