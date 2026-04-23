import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { ChatSessionUser } from './types';
import { resolveSupabaseRole } from '@/lib/auth/supabaseRole';

function roleFromUser(user: User): 'brand' | 'athlete' {
  return resolveSupabaseRole({
    userMetadata: user.user_metadata as Record<string, unknown> | undefined,
    appMetadata: user.app_metadata as Record<string, unknown> | undefined,
  });
}

export function chatSessionUserFromSupabaseUser(user: User): ChatSessionUser {
  return {
    id: user.id,
    role: roleFromUser(user),
    email: user.email ?? undefined,
  };
}

export async function getChatSessionUser(
  supabase: SupabaseClient
): Promise<ChatSessionUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return chatSessionUserFromSupabaseUser(data.user);
}
