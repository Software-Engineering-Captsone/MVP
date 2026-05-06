import { createClient } from '@/lib/supabase/server';
import type { Athlete, PlatformMetrics, ContentItem } from '@/lib/mockData';

/**
 * Public-facing athlete profile aggregate.
 *
 * Stitches profiles + athlete_sports (primary) + athlete_academics + athlete_socials +
 * athlete_achievements into the `Athlete` shape the dashboard already renders.
 *
 * Fields with no DB column today (heightWeight, nilScore, contentItems, compatibilityScore)
 * are returned as safe defaults so the UI degrades gracefully.
 */

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  verified: boolean | null;
  role: string | null;
};

type SportRow = {
  athlete_id: string;
  sport: string | null;
  position: string | null;
  jersey_number: string | null;
  is_primary: boolean | null;
};

type AcademicRow = {
  athlete_id: string;
  school: string | null;
  major: string | null;
  current_year: string | null;
};

type SocialRow = {
  athlete_id: string;
  instagram: string | null;
  instagram_followers: number | null;
  instagram_engagement: number | null;
  tiktok: string | null;
  tiktok_followers: number | null;
  tiktok_engagement: number | null;
  tiktok_avg_views: number | null;
  facebook: string | null;
  facebook_followers: number | null;
  engagement_rate: number | null;
  posts_per_month: number | null;
  total_followers: number | null;
  total_views: number | null;
  estimated_impressions: number | null;
};

type AchievementRow = {
  athlete_id: string;
  title: string | null;
  display_order: number | null;
};

/** Compact integer formatting: 10120 → "10.1K", 1_020_000 → "1.02M". */
function formatCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/** numeric percent (e.g. 6.8) → "6.8%". null/undefined → "0%". */
function formatRate(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0%';
  return `${Number(n).toFixed(1).replace(/\.0$/, '')}%`;
}

function buildPlatformMetrics(
  handle: string | null | undefined,
  followers: number | null | undefined,
  postsPerMonth: number | null | undefined,
  engagementRate: number | null | undefined
): PlatformMetrics {
  return {
    handle: handle || '',
    followers: formatCount(followers),
    postsPerMonth: postsPerMonth ?? 0,
    engagementRate: formatRate(engagementRate),
  };
}

/** Returns the public athlete profile, or null if not found / not an athlete. */
export async function getAthleteProfile(athleteId: string): Promise<Athlete | null> {
  const supabase = await createClient();

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, banner_url, bio, city, state, verified, role')
    .eq('id', athleteId)
    .maybeSingle<ProfileRow>();

  if (profileErr || !profile || profile.role !== 'athlete') return null;

  // Fan-out: small per-athlete tables — fine to run in parallel.
  const [sportsRes, academicsRes, socialsRes, achievementsRes] = await Promise.all([
    supabase
      .from('athlete_sports')
      .select('athlete_id, sport, position, jersey_number, is_primary')
      .eq('athlete_id', athleteId)
      .order('is_primary', { ascending: false }),
    supabase
      .from('athlete_academics')
      .select('athlete_id, school, major, current_year')
      .eq('athlete_id', athleteId)
      .maybeSingle<AcademicRow>(),
    supabase
      .from('athlete_socials')
      .select(
        'athlete_id, instagram, instagram_followers, instagram_engagement, tiktok, tiktok_followers, tiktok_engagement, tiktok_avg_views, facebook, facebook_followers, engagement_rate, posts_per_month, total_followers, total_views, estimated_impressions'
      )
      .eq('athlete_id', athleteId)
      .maybeSingle<SocialRow>(),
    supabase
      .from('athlete_achievements')
      .select('athlete_id, title, display_order')
      .eq('athlete_id', athleteId)
      .order('display_order', { ascending: true, nullsFirst: false }),
  ]);

  const sports = (sportsRes.data ?? []) as SportRow[];
  const primarySport = sports.find((s) => s.is_primary) ?? sports[0] ?? null;
  const academics = academicsRes.data ?? null;
  const socials = socialsRes.data ?? null;
  const achievements = ((achievementsRes.data ?? []) as AchievementRow[])
    .map((r) => r.title?.trim())
    .filter((t): t is string => !!t);

  const hometown = [profile.city, profile.state].filter(Boolean).join(', ');

  const igHandle = socials?.instagram ?? '';
  const ttHandle = socials?.tiktok ?? '';
  const fbHandle = socials?.facebook ?? '';

  // postsPerMonth lives at the social aggregate level — apportion to platforms equally
  // until per-platform post counts are tracked. Acceptable approximation for the UI.
  const ppm = socials?.posts_per_month ?? 0;

  const athlete: Athlete = {
    id: profile.id,
    name: profile.full_name ?? '',
    sport: primarySport?.sport ?? '',
    school: academics?.school ?? '',
    image: profile.avatar_url ?? '',
    verified: !!profile.verified,
    stats: {
      instagram: formatCount(socials?.instagram_followers),
      tiktok: formatCount(socials?.tiktok_followers),
      facebook: formatCount(socials?.facebook_followers),
    },
    bio: profile.bio ?? '',
    bannerImage: profile.banner_url ?? '',
    position: primarySport?.position ?? '',
    academicYear: academics?.current_year ?? '',
    hometown,
    major: academics?.major ?? '',
    heightWeight: '', // not yet captured in DB
    jerseyNumber: primarySport?.jersey_number ?? '',
    nilScore: 0, // computed downstream — placeholder until scoring service lands
    socialHandles: {
      instagram: igHandle,
      tiktok: ttHandle,
      facebook: fbHandle,
    },
    platformMetrics: {
      instagram: buildPlatformMetrics(
        igHandle,
        socials?.instagram_followers,
        ppm,
        socials?.instagram_engagement
      ),
      tiktok: buildPlatformMetrics(
        ttHandle,
        socials?.tiktok_followers,
        ppm,
        socials?.tiktok_engagement
      ),
      facebook: buildPlatformMetrics(fbHandle, socials?.facebook_followers, ppm, null),
    },
    aggregate: {
      totalFollowers: formatCount(socials?.total_followers),
      engagementRate: formatRate(socials?.engagement_rate),
      totalViews: formatCount(socials?.total_views),
      monthlyPosts: socials?.posts_per_month ?? 0,
      estimatedImpressions: formatCount(socials?.estimated_impressions),
    },
    achievements,
    contentItems: [] as ContentItem[], // content feed not modeled yet
    openToDeals: true,
    compatibilityScore: 0, // brand-side derived value
  };

  return athlete;
}
