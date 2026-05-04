// Server-only — do not import in 'use client' components.
// Platform OAuth configuration and token exchange helpers.

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube';

interface PlatformConfig {
  authUrl: (state: string) => string;
  tokenUrl: string;
  exchangeToken: (code: string, redirectUri: string) => Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }>;
  fetchUserInfo: (accessToken: string) => Promise<{ platformUserId: string; handle: string; followerCount: number; followingCount: number; extraStats: Record<string, unknown> }>;
}

export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    authUrl: (state) => {
      const params = new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID ?? '',
        redirect_uri: `${BASE_URL}/api/social/callback/instagram`,
        scope: 'instagram_business_basic',
        response_type: 'code',
        state,
      });
      return `https://api.instagram.com/oauth/authorize?${params}`;
    },
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    async exchangeToken(code, redirectUri) {
      const body = new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID ?? '',
        client_secret: process.env.INSTAGRAM_APP_SECRET ?? '',
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      });
      const res = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        body,
      });
      const json = await res.json() as { access_token?: string; error_message?: string };
      if (!json.access_token) throw new Error(json.error_message ?? 'Instagram token exchange failed');
      return { accessToken: json.access_token };
    },
    async fetchUserInfo(accessToken) {
      const params = new URLSearchParams({ fields: 'id,username,followers_count', access_token: accessToken });
      const res = await fetch(`https://graph.instagram.com/me?${params}`);
      const json = await res.json() as { id?: string; username?: string; followers_count?: number };
      return {
        platformUserId: json.id ?? '',
        handle: json.username ?? '',
        followerCount: json.followers_count ?? 0,
        followingCount: 0,
        extraStats: {},
      };
    },
  },

  tiktok: {
    authUrl: (state) => {
      const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
        redirect_uri: `${BASE_URL}/api/social/callback/tiktok`,
        scope: 'user.info.basic,user.info.stats',
        response_type: 'code',
        state,
      });
      return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
    },
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    async exchangeToken(code, redirectUri) {
      const body = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const json = await res.json() as { data?: { access_token?: string; refresh_token?: string; expires_in?: number }; error?: { code?: string; message?: string } };
      if (!json.data?.access_token) throw new Error(json.error?.message ?? 'TikTok token exchange failed');
      return { accessToken: json.data.access_token, refreshToken: json.data.refresh_token, expiresIn: json.data.expires_in };
    },
    async fetchUserInfo(accessToken) {
      const params = new URLSearchParams({ fields: 'open_id,display_name,follower_count,following_count' });
      const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?${params}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json() as { data?: { user?: { open_id?: string; display_name?: string; follower_count?: number; following_count?: number } } };
      const u = json.data?.user ?? {};
      return {
        platformUserId: u.open_id ?? '',
        handle: u.display_name ?? '',
        followerCount: u.follower_count ?? 0,
        followingCount: u.following_count ?? 0,
        extraStats: {},
      };
    },
  },

  youtube: {
    authUrl: (state) => {
      const params = new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID ?? '',
        redirect_uri: `${BASE_URL}/api/social/callback/youtube`,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
        access_type: 'offline',
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    },
    tokenUrl: 'https://oauth2.googleapis.com/token',
    async exchangeToken(code, redirectUri) {
      const body = new URLSearchParams({
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID ?? '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
      const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
      const json = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
      if (!json.access_token) throw new Error(json.error ?? 'YouTube token exchange failed');
      return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in };
    },
    async fetchUserInfo(accessToken) {
      const params = new URLSearchParams({ part: 'statistics,snippet', mine: 'true' });
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json() as { items?: Array<{ id?: string; snippet?: { title?: string }; statistics?: { subscriberCount?: string; viewCount?: string } }> };
      const item = json.items?.[0];
      const handle = item?.snippet?.title ?? '';
      const subscribers = parseInt(item?.statistics?.subscriberCount ?? '0', 10);
      const views = parseInt(item?.statistics?.viewCount ?? '0', 10);
      return {
        platformUserId: item?.id ?? '',
        handle,
        followerCount: subscribers,
        followingCount: 0,
        extraStats: { viewCount: views },
      };
    },
  },
};

export function getRedirectUri(platform: SocialPlatform): string {
  return `${BASE_URL}/api/social/callback/${platform}`;
}
