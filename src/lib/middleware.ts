import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

      const meta = user.user_metadata ?? {};

      return handler(request, {
        userId: user.id,
        email: user.email ?? '',
        role: (meta.role as string) ?? 'athlete',
      });
    } catch {
      return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
    }
  };
}
