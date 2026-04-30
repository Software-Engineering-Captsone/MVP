import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Athlete, ContentItem, PlatformMetrics } from '@/lib/mockData';

/**
 * GET /api/marketplace/athletes
 * Returns onboarded athletes with joined sports/academics/socials/achievements/content,
 * mapped to the legacy `Athlete` shape used by the discovery UI.
 *
 * RLS: every athlete_* table allows public select, so this works without a service-role key.
 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, avatar_url, banner_url, bio, hometown, verified,
      athlete_sports(sport, position, jersey_number, is_primary),
      athlete_academics(school, major, current_year),
      athlete_socials(
        instagram, instagram_followers, instagram_engagement, instagram_avg_likes,
        tiktok, tiktok_followers, tiktok_engagement, tiktok_avg_views,
        facebook, facebook_followers,
        total_followers, engagement_rate, posts_per_month, total_views, estimated_impressions
      ),
      athlete_achievements(title, year, display_order),
      athlete_content(content_type, media_url, thumbnail_url, caption, overlay_text, views, posted_at, display_order)
    `)
    .eq('role', 'athlete')
    .not('onboarding_completed_at', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const athletes: Athlete[] = (data ?? []).map((row) => mapRowToAthlete(row as unknown as Row));
  return NextResponse.json(athletes);
}

export const dynamic = 'force-dynamic';

function fmtCount(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!isFinite(v) || v <= 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function fmtPct(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return `${v.toFixed(1)}%`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

type Row = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  hometown: string | null;
  verified: boolean | null;
  athlete_sports: Array<{ sport: string; position: string; jersey_number: string; is_primary: boolean }>;
  athlete_academics: Array<{ school: string; major: string; current_year: string }>;
  athlete_socials: Array<{
    instagram: string; instagram_followers: number; instagram_engagement: number; instagram_avg_likes: number;
    tiktok: string; tiktok_followers: number; tiktok_engagement: number; tiktok_avg_views: number;
    facebook: string; facebook_followers: number;
    total_followers: number; engagement_rate: number; posts_per_month: number;
    total_views: number; estimated_impressions: number;
  }>;
  athlete_achievements: Array<{ title: string; year: number | null; display_order: number }>;
  athlete_content: Array<{
    content_type: 'image' | 'video'; media_url: string; thumbnail_url: string;
    caption: string; overlay_text: string; views: number; posted_at: string | null; display_order: number;
  }>;
};

function mapRowToAthlete(row: Row): Athlete {
  const primarySport = row.athlete_sports?.find((s) => s.is_primary) ?? row.athlete_sports?.[0];
  const academics = row.athlete_academics?.[0];
  const socials = row.athlete_socials?.[0];

  const igHandle = socials?.instagram ?? '';
  const ttHandle = socials?.tiktok ?? '';
  const fbHandle = socials?.facebook ?? '';

  const platformMetrics: { instagram: PlatformMetrics; tiktok: PlatformMetrics; facebook: PlatformMetrics } = {
    instagram: {
      handle: igHandle,
      followers: fmtCount(socials?.instagram_followers),
      postsPerMonth: socials?.posts_per_month ?? 0,
      engagementRate: fmtPct(socials?.instagram_engagement),
    },
    tiktok: {
      handle: ttHandle,
      followers: fmtCount(socials?.tiktok_followers),
      postsPerMonth: socials?.posts_per_month ?? 0,
      engagementRate: fmtPct(socials?.tiktok_engagement),
    },
    facebook: {
      handle: fbHandle,
      followers: fmtCount(socials?.facebook_followers),
      postsPerMonth: 0,
      engagementRate: '0.0%',
    },
  };

  const contentItems: ContentItem[] = [...(row.athlete_content ?? [])]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((c, i) => ({
      id: `${row.id}-c${i}`,
      type: c.content_type,
      thumbnailUrl: c.thumbnail_url || c.media_url,
      views: fmtCount(c.views),
      caption: c.caption || '',
      datePosted: fmtDate(c.posted_at),
      overlayText: c.overlay_text || undefined,
    }));

  const achievements = [...(row.athlete_achievements ?? [])]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((a) => (a.year ? `${a.year} ${a.title}` : a.title));

  return {
    id: row.id,
    name: row.full_name || 'Athlete',
    sport: primarySport?.sport || '',
    school: academics?.school || '',
    image: row.avatar_url || '',
    verified: !!row.verified,
    stats: {
      instagram: fmtCount(socials?.instagram_followers),
      tiktok: fmtCount(socials?.tiktok_followers),
      facebook: fmtCount(socials?.facebook_followers),
    },
    bio: row.bio || '',
    contentImages: contentItems.filter((c) => c.type === 'image').slice(0, 3).map((c) => c.thumbnailUrl),
    bannerImage: row.banner_url || row.avatar_url || '',
    position: primarySport?.position || '',
    academicYear: academics?.current_year || '',
    hometown: row.hometown || '',
    major: academics?.major || '',
    heightWeight: '',
    jerseyNumber: primarySport?.jersey_number ? `#${primarySport.jersey_number}` : '',
    nilScore: 0,
    socialHandles: { instagram: igHandle, tiktok: ttHandle, facebook: fbHandle },
    platformMetrics,
    aggregate: {
      totalFollowers: fmtCount(socials?.total_followers),
      engagementRate: fmtPct(socials?.engagement_rate),
      totalViews: fmtCount(socials?.total_views),
      monthlyPosts: socials?.posts_per_month ?? 0,
      estimatedImpressions: fmtCount(socials?.estimated_impressions),
    },
    achievements,
    contentItems,
    openToDeals: true,
    compatibilityScore: 0,
  };
}
