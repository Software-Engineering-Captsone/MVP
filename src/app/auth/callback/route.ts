import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles the redirect from Supabase Auth after:
 * - Email confirmation (type=email)
 * - Password recovery (type=recovery)
 * - Google OAuth (type=oauth / implicit via PKCE)
 *
 * Supabase sends an auth code that we exchange for a session here.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, send them to auth with an error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
