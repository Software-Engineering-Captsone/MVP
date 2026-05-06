import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { ChatSessionUser } from './types';

export function chatSessionUserFromSupabaseUser(user: User): ChatSessionUser {
  return {
    id: user.id,
    role: 'athlete',
    email: user.email ?? undefined,
  };
}

export async function getChatSessionUser(
  supabase: SupabaseClient
): Promise<ChatSessionUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle<{ role: string | null }>();

  return {
    ...chatSessionUserFromSupabaseUser(data.user),
    role: profile?.role === 'brand' ? 'brand' : 'athlete',
  };
}
