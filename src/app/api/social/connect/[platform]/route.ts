import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLATFORM_CONFIGS, type SocialPlatform } from '@/lib/socialOAuth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const VALID_PLATFORMS: SocialPlatform[] = ['instagram', 'tiktok', 'youtube'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;

  if (!VALID_PLATFORMS.includes(platform as SocialPlatform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // CSRF state: random hex + userId encoded together
  const randomPart = crypto.randomBytes(16).toString('hex');
  const state = `${randomPart}:${user.id}`;

  const cookieStore = await cookies();
  cookieStore.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  const config = PLATFORM_CONFIGS[platform as SocialPlatform];
  const oauthUrl = config.authUrl(state);

  return NextResponse.redirect(oauthUrl);
}
