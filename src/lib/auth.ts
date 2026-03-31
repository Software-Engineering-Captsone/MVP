/**
 * DEPRECATED: Auth verification is now handled by Supabase.
 * This file is kept for backward compatibility with any imports.
 * Use createClient() from '@/lib/supabase/server' or '@/lib/supabase/client' instead.
 */

export interface AuthUser {
  userId: string;
  email: string;
  role: 'athlete' | 'brand';
}

/** @deprecated Use Supabase auth instead. */
export function verifyToken(_token: string): AuthUser | null {
  console.warn('verifyToken() is deprecated. Use Supabase auth instead.');
  return null;
}
