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
  const role = normalizeRole(searchParams.get('role'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (role) {
          await supabase
            .from('profiles')
            .update({ role })
            .eq('id', user.id)
            .is('onboarding_completed_at', null);
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('id', user.id)
          .maybeSingle<{ onboarding_completed_at: string | null }>();

        if (!profile?.onboarding_completed_at && next === '/dashboard') {
          return NextResponse.redirect(`${origin}/dashboard/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, send them to auth with an error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}

function normalizeRole(value: string | null): 'athlete' | 'brand' | null {
  if (value === 'athlete' || value === 'brand') return value;
  if (value === 'business') return 'brand';
  return null;
}
