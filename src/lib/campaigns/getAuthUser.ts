import { createClient } from '@/lib/supabase/server';

/**
 * Minimal user identity for API routes. We look up role from the
 * profiles table instead of JWT custom claims, so role changes take
 * effect the moment the DB row updates — no re-login required.
 */
export interface AuthUser {
  userId: string;
  role: 'athlete' | 'brand';
}

/**
 * Async replacement for the old JWT-Bearer helper. Reads the Supabase
 * auth cookie via @supabase/ssr, then resolves the caller's role from
 * public.profiles. Returns null for unauthenticated requests.
 *
 * Route handlers should: `const user = await getAuthUser();`
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Default to athlete if the profile row is missing or the role is
  // unexpected. This is the safer default — athlete permissions are
  // narrower than brand permissions across our RLS policies.
  const role: AuthUser['role'] = profile?.role === 'brand' ? 'brand' : 'athlete';

  return { userId: user.id, role };
}
