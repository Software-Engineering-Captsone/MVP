import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';

const VALID_PLATFORMS = ['instagram', 'tiktok', 'youtube'];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;

  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();

  // Remove the OAuth token
  await service
    .from('athlete_social_tokens')
    .delete()
    .eq('athlete_id', user.id)
    .eq('platform', platform);

  // Clear handle + follower count from athlete_socials
  const followerColumn =
    platform === 'youtube' ? 'youtube_subscribers' : `${platform}_followers`;

  await service
    .from('athlete_socials')
    .update({ [platform]: '', [followerColumn]: 0 })
    .eq('athlete_id', user.id);

  return NextResponse.json({ ok: true });
}
