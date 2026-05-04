import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { PLATFORM_CONFIGS, getRedirectUri, type SocialPlatform } from '@/lib/socialOAuth';
import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const VALID_PLATFORMS: SocialPlatform[] = ['instagram', 'tiktok', 'youtube'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const onboardingUrl = `${BASE_URL}/dashboard/onboarding`;

  if (!VALID_PLATFORMS.includes(platform as SocialPlatform)) {
    return NextResponse.redirect(`${onboardingUrl}?error=invalid_platform`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get(`oauth_state_${platform}`)?.value;
  cookieStore.delete(`oauth_state_${platform}`);

  if (!storedState || storedState !== stateParam) {
    return NextResponse.redirect(`${onboardingUrl}?error=oauth_state_mismatch`);
  }

  if (!code) {
    return NextResponse.redirect(`${onboardingUrl}?error=${platform}_oauth_failed`);
  }

  // Extract userId from state (format: "{randomHex}:{userId}")
  const userId = storedState.split(':').slice(1).join(':');
  if (!userId) {
    return NextResponse.redirect(`${onboardingUrl}?error=oauth_state_mismatch`);
  }

  try {
    const config = PLATFORM_CONFIGS[platform as SocialPlatform];
    const redirectUri = getRedirectUri(platform as SocialPlatform);

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } = await config.exchangeToken(code, redirectUri);

    // Fetch user info + stats
    const { platformUserId, handle, followerCount, followingCount, extraStats } =
      await config.fetchUserInfo(accessToken);

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const service = createServiceClient();

    // Upsert into athlete_social_tokens
    await service.from('athlete_social_tokens').upsert(
      {
        athlete_id: userId,
        platform,
        platform_user_id: platformUserId,
        handle,
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
        token_expires_at: tokenExpiresAt,
        follower_count: followerCount,
        following_count: followingCount,
        extra_stats: extraStats,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id,platform' },
    );

    // Update athlete_socials handle + follower count
    const followerColumn =
      platform === 'youtube' ? 'youtube_subscribers' : `${platform}_followers`;
    const handleColumn = platform as string;

    await service
      .from('athlete_socials')
      .upsert(
        {
          athlete_id: userId,
          [handleColumn]: handle,
          [followerColumn]: followerCount,
        },
        { onConflict: 'athlete_id' },
      );

    return NextResponse.redirect(`${onboardingUrl}?connected=${platform}`);
  } catch (err) {
    console.error(`[social/callback/${platform}]`, err);
    return NextResponse.redirect(`${onboardingUrl}?error=${platform}_oauth_failed`);
  }
}
