import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createClient } from '@/lib/supabase/server';
import type { Athlete, ContentItem, PlatformMetrics } from '@/lib/mockData';

/**
 * GET /api/marketplace/athletes
 * Returns onboarded athletes with joined sports/academics/socials/achievements/content,
 * mapped to the legacy `Athlete` shape used by the discovery UI.
 *
 * RLS: profiles SELECT is gated to the `authenticated` role for completed
 * onboardings; the athlete_* child tables allow public select. Discovery
 * surfaces are auth-gated, so any signed-in caller sees the full set.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const sport = (searchParams.get('sport') ?? '').trim().toLowerCase();
  const school = (searchParams.get('school') ?? '').trim().toLowerCase();
  const verified = searchParams.get('verified');
  const sort = searchParams.get('sort') ?? 'popular';
  const limit = clampNumber(searchParams.get('limit'), 1, 100, 100);
  const offset = clampNumber(searchParams.get('offset'), 0, 10_000, 0);

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, avatar_url, banner_url, bio, city, state, hometown, verified,
      athlete_sports(sport, position, jersey_number, is_primary),
      athlete_academics(school, major, current_year),
      athlete_socials(
        instagram, instagram_followers, instagram_engagement, instagram_avg_likes,
        tiktok, tiktok_followers, tiktok_engagement, tiktok_avg_views,
        facebook, facebook_followers,
        total_followers, engagement_rate, posts_per_month, total_views, estimated_impressions
      ),
      athlete_achievements(title, year, display_order),
      athlete_content(content_type, media_url, thumbnail_url, caption, overlay_text, views, likes, posted_at, display_order)
    `)
    .eq('role', 'athlete')
    .not('onboarding_completed_at', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allAthletes: Athlete[] = (data ?? []).map((row) => mapRowToAthlete(row as unknown as Row));
  const filtered = allAthletes
    .filter((athlete) => {
      if (q) {
        const haystack = [
          athlete.name,
          athlete.sport,
          athlete.school,
          athlete.position,
          athlete.hometown,
          athlete.major,
          athlete.bio,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (sport && athlete.sport.toLowerCase() !== sport) return false;
      if (school && !athlete.school.toLowerCase().includes(school)) return false;
      if (verified === 'true' && !athlete.verified) return false;
      if (verified === 'false' && athlete.verified) return false;
      return true;
    })
    .sort((a, b) => compareAthletes(a, b, sort));

  const paged = filtered.slice(offset, offset + limit);
  const response = NextResponse.json(paged);
  response.headers.set('X-Total-Count', String(filtered.length));
  response.headers.set('X-Result-Offset', String(offset));
  response.headers.set('X-Result-Limit', String(limit));
  return response;
}

export const dynamic = 'force-dynamic';

function fmtCount(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!isFinite(v) || v <= 0) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(v));
}

function fmtPct(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!isFinite(v) || v <= 0) return '—';
  return `${v.toFixed(1).replace(/\.0$/, '')}%`;
}

function parseHumanNumber(value: string): number {
  const raw = value.trim().toUpperCase();
  if (!raw || raw === '—') return 0;
  const multiplier = raw.endsWith('M') ? 1_000_000 : raw.endsWith('K') ? 1_000 : 1;
  const numeric = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric * multiplier : 0;
}

function parsePercent(value: string): number {
  const numeric = Number.parseFloat(value.replace('%', ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampNumber(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function compareAthletes(a: Athlete, b: Athlete, sort: string): number {
  if (sort === 'name') return a.name.localeCompare(b.name);
  if (sort === 'school') return a.school.localeCompare(b.school) || a.name.localeCompare(b.name);
  if (sort === 'engagement') {
    return parsePercent(b.aggregate.engagementRate) - parsePercent(a.aggregate.engagementRate);
  }
  if (sort === 'newest') return b.verified === a.verified ? a.name.localeCompare(b.name) : Number(b.verified) - Number(a.verified);
  return (
    parseHumanNumber(b.aggregate.totalFollowers) - parseHumanNumber(a.aggregate.totalFollowers) ||
    parsePercent(b.aggregate.engagementRate) - parsePercent(a.aggregate.engagementRate) ||
    a.name.localeCompare(b.name)
  );
}

type Row = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
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
    content_type: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    caption: string | null;
    overlay_text: string | null;
    views: number | null;
    likes: number | null;
    posted_at: string | null;
    display_order: number | null;
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
    .filter((item) => !!item.media_url)
    .map((item, index) => ({
      id: `${row.id}-content-${index}`,
      type: item.content_type === 'video' ? 'video' : 'image',
      thumbnailUrl: item.thumbnail_url || item.media_url || '',
      views: fmtCount(item.views),
      caption: item.caption ?? '',
      datePosted: item.posted_at ?? '',
      overlayText: item.overlay_text ?? undefined,
    }));

  const achievements = [...(row.athlete_achievements ?? [])]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((a) => (a.year ? `${a.year} ${a.title}` : a.title));
  const totalFollowers = Number(socials?.total_followers ?? 0);
  const engagementRate = Number(socials?.engagement_rate ?? 0);
  const nilScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.log10(Math.max(totalFollowers, 1)) * 12 +
          Math.max(0, Math.min(engagementRate, 15)) * 3 +
          (row.verified ? 10 : 0) +
          (row.bio ? 5 : 0)
      )
    )
  );

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
    hometown: row.hometown?.trim() || [row.city, row.state].filter(Boolean).join(', '),
    major: academics?.major || '',
    heightWeight: '',
    jerseyNumber: primarySport?.jersey_number ? `#${primarySport.jersey_number}` : '',
    nilScore,
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
    compatibilityScore: nilScore,
  };
}
