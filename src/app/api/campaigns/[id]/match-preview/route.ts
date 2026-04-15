import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { getCampaignById } from '@/lib/campaigns/repository';
import { buildMatchPreviewEstimate } from '@/lib/campaigns/matchPreview';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

function parseBoolean(input: string | null): boolean {
  return input === '1' || input === 'true';
}

export async function GET(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const campaign = await getCampaignById(id);
  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const user = { userId: session.id, role: session.role };
  const isOwner = user.role === 'brand' && campaign.brandUserId === user.userId;
  const isPublicAthleteView = user.role === 'athlete' && campaign.visibility === 'Public';
  if (!isOwner && !isPublicAthleteView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const refreshing = parseBoolean(request.nextUrl.searchParams.get('refreshing'));
  const stale = parseBoolean(request.nextUrl.searchParams.get('stale'));
  const estimate = buildMatchPreviewEstimate(campaign, { refreshing, stale });

  return NextResponse.json({
    campaignId: id,
    estimatedMatch: {
      status: estimate.status,
      range: estimate.range,
      confidence: estimate.confidence,
      confidenceScore: estimate.confidenceScore,
      confidenceReason: estimate.confidenceReason,
      methodology: estimate.methodology,
      computedAt: estimate.computedAt,
      version: estimate.version,
      modelVersion: estimate.modelVersion,
      inputHash: estimate.inputHash,
      staleAfterMs: estimate.staleAfterMs,
      recommendedRefreshSec: estimate.recommendedRefreshSec,
      staleness: estimate.staleness,
      disclaimer: 'Estimate only. Actual qualified athletes may vary as filters and profile data evolve.',
    },
  });
}
