import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveSupabaseRole } from '@/lib/auth/supabaseRole';

/**
 * Server-side auth wrapper for API route handlers.
 * Replaces the old JWT-based withAuth() — now uses Supabase session cookies.
 */
export function withAuth(
  handler: (request: NextRequest, user: { userId: string; email: string; role: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const role = resolveSupabaseRole({
        userMetadata: user.user_metadata as Record<string, unknown> | undefined,
        appMetadata: user.app_metadata as Record<string, unknown> | undefined,
      });

      return handler(request, {
        userId: user.id,
        email: user.email ?? '',
        role,
      });
    } catch {
      return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
    }
  };
}
