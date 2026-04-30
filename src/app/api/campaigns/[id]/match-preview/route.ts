import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCampaignById } from '@/lib/campaigns/repository';
import { buildMatchPreviewEstimate } from '@/lib/campaigns/matchPreview';
import type { MatchPreviewStatus } from '@/lib/campaigns/matchPreview';

/**
 * GET /api/campaigns/:id/match-preview
 * Returns an `estimatedMatch` heuristic, overriding the heuristic range with a
 * real Supabase count when the campaign filters are concrete enough.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const baseEstimate = buildMatchPreviewEstimate(campaign as unknown as Parameters<typeof buildMatchPreviewEstimate>[0]);

  // Real match count: athletes with completed onboarding whose primary sport
  // matches (when set), gender matches (when set), and total_followers ≥ min.
  const supabase = await createClient();
  const sport = String(campaign.sport ?? '').trim();
  const gender = String(campaign.genderFilter ?? '').trim();
  const followerMin = Number(campaign.followerMin ?? 0);

  let realCount: number | null = null;
  try {
    let query = supabase
      .from('profiles')
      .select('id, athlete_sports!inner(sport, is_primary), athlete_socials(total_followers)', { count: 'exact', head: true })
      .eq('role', 'athlete')
      .not('onboarding_completed_at', 'is', null);

    if (sport && sport !== 'All Sports') {
      query = query.eq('athlete_sports.sport', sport).eq('athlete_sports.is_primary', true);
    }
    if (gender && gender !== 'Any') {
      const dbGender = gender.toLowerCase() === 'female' ? 'female'
        : gender.toLowerCase() === 'male' ? 'male'
        : '';
      if (dbGender) query = query.eq('gender', dbGender);
    }
    if (followerMin > 0) {
      query = query.gte('athlete_socials.total_followers', followerMin);
    }

    const { count, error } = await query;
    if (!error && typeof count === 'number') {
      realCount = count;
    }
  } catch {
    realCount = null;
  }

  let range = baseEstimate.range;
  let status: MatchPreviewStatus = baseEstimate.status;
  let confidence = baseEstimate.confidence;
  let confidenceReason = baseEstimate.confidenceReason;

  if (realCount !== null) {
    range = { min: realCount, max: realCount };
    if (realCount === 0) {
      status = 'no_matches';
      confidence = 'low';
      confidenceReason = 'No athletes currently match the targeting filters.';
    } else {
      status = 'ready';
      confidence = 'medium';
      confidenceReason = 'Exact match count from current athlete pool.';
    }
  }

  const estimatedMatch = {
    ...baseEstimate,
    status,
    range,
    confidence,
    confidenceReason,
  };

  return NextResponse.json({ estimatedMatch });
}

export const dynamic = 'force-dynamic';
