import { createClient } from '@/lib/supabase/client';

export interface ConnectedPlatform {
  platform: string;
  handle: string;
  followerCount: number;
  connectedAt: string;
}

export async function getConnectedSocialTokens(): Promise<ConnectedPlatform[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('athlete_social_tokens')
    .select('platform, handle, follower_count, connected_at')
    .order('connected_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => ({
    platform: row.platform as string,
    handle: row.handle as string,
    followerCount: (row.follower_count as number) ?? 0,
    connectedAt: row.connected_at as string,
  }));
}
