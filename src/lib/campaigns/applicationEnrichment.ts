import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { createClient } from '@/lib/supabase/server';
import type { StoredApplication } from './repository';
import { applicationToJSON } from './serialization';

type AthleteSnapshot = {
  name?: string;
  sport?: string;
  school?: string;
  image?: string;
  followers?: string;
  engagement?: string;
  verified?: boolean;
};

type AthleteApplicationMeta = {
  name: string;
  sport: string;
  school: string;
  image: string;
  followers: string;
  engagement: string;
  verified: boolean;
};

export type EnrichedApplicationJSON = Omit<ReturnType<typeof applicationToJSON>, 'athleteSnapshot'> & {
  athleteSnapshot: AthleteSnapshot;
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatCompactCount(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

function formatPct(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${n.toFixed(1).replace(/\.0$/, '')}%`;
}

async function loadAthleteApplicationMeta(
  supabase: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, AthleteApplicationMeta>> {
  const lookupClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : supabase;
  const ids = [...new Set(athleteIds.map((id) => id.trim()).filter(Boolean))];
  const meta = new Map<string, AthleteApplicationMeta>();
  const ensure = (id: string): AthleteApplicationMeta => {
    const current = meta.get(id);
    if (current) return current;
    const next = {
      name: '',
      sport: '',
      school: '',
      image: '',
      followers: '—',
      engagement: '—',
      verified: false,
    };
    meta.set(id, next);
    return next;
  };

  if (ids.length === 0) return meta;

  const { data: profiles, error: profileError } = await lookupClient
    .from('profiles')
    .select('id, full_name, avatar_url, verified')
    .in('id', ids);
  if (profileError) throw new Error(profileError.message);
  for (const row of profiles ?? []) {
    const id = String(row.id ?? '');
    if (!id) continue;
    const target = ensure(id);
    if (hasText(row.full_name)) target.name = row.full_name.trim();
    if (hasText(row.avatar_url)) target.image = row.avatar_url.trim();
    target.verified = row.verified === true;
  }

  const { data: sports, error: sportError } = await lookupClient
    .from('athlete_sports')
    .select('athlete_id, sport, is_primary')
    .in('athlete_id', ids)
    .order('is_primary', { ascending: false });
  if (sportError) throw new Error(sportError.message);
  for (const row of sports ?? []) {
    const id = String(row.athlete_id ?? '');
    if (!id || !hasText(row.sport)) continue;
    const target = ensure(id);
    if (!target.sport) target.sport = row.sport.trim();
  }

  const { data: academics, error: academicError } = await lookupClient
    .from('athlete_academics')
    .select('athlete_id, school')
    .in('athlete_id', ids);
  if (academicError) throw new Error(academicError.message);
  for (const row of academics ?? []) {
    const id = String(row.athlete_id ?? '');
    if (!id || !hasText(row.school)) continue;
    ensure(id).school = row.school.trim();
  }

  const { data: socials, error: socialError } = await lookupClient
    .from('athlete_socials')
    .select('athlete_id, total_followers, engagement_rate')
    .in('athlete_id', ids);
  if (socialError) throw new Error(socialError.message);
  for (const row of socials ?? []) {
    const id = String(row.athlete_id ?? '');
    if (!id) continue;
    const target = ensure(id);
    target.followers = formatCompactCount(row.total_followers);
    target.engagement = formatPct(row.engagement_rate);
  }

  return meta;
}

export async function enrichApplicationsForBrandCampaigns(
  applications: StoredApplication[],
): Promise<EnrichedApplicationJSON[]> {
  const supabase = await createClient();
  const meta = await loadAthleteApplicationMeta(
    supabase,
    applications.map((application) => String(application.athleteUserId ?? '')),
  );

  return applications.map((application) => {
    const json = applicationToJSON(application) as EnrichedApplicationJSON;
    const current = json.athleteSnapshot ?? {};
    const live = meta.get(String(json.athleteUserId ?? ''));
    if (!live) return json;
    return {
      ...json,
      athleteSnapshot: {
        ...current,
        name: live.name || current.name || 'Athlete',
        sport: live.sport || current.sport || '',
        school: live.school || current.school || '',
        image: live.image || current.image || '',
        followers: live.followers !== '—' ? live.followers : current.followers ?? '—',
        engagement: live.engagement !== '—' ? live.engagement : current.engagement ?? '—',
        verified: live.verified,
      },
    };
  });
}
