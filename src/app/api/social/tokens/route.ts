import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('athlete_social_tokens')
    .select('platform, handle, follower_count, connected_at')
    .order('connected_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const platforms = (data ?? []).map((row) => ({
    platform: row.platform,
    handle: row.handle,
    followerCount: row.follower_count ?? 0,
    connectedAt: row.connected_at,
  }));

  return NextResponse.json({ platforms });
}
