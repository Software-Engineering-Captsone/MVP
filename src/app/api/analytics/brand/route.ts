import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/jsonError';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { listDealsForCurrentUser } from '@/lib/campaigns/deals/supabaseRepository';
import { createClient } from '@/lib/supabase/server';

type StatusCount = Record<string, number>;

function increment(map: StatusCount, key: string | null | undefined) {
  const k = key && key.trim() ? key.trim() : 'unknown';
  map[k] = (map[k] ?? 0) + 1;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function estimateOfferAmountCents(draft: unknown): number {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return 0;
  const root = draft as Record<string, unknown>;
  const wizard = root.wizard && typeof root.wizard === 'object' ? root.wizard as Record<string, unknown> : root;
  const basics = wizard.basics && typeof wizard.basics === 'object'
    ? wizard.basics as Record<string, unknown>
    : wizard;
  const amount = toNumber(basics.amount ?? basics.compensation ?? basics.budget);
  return Math.round(amount * 100);
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');
  if (user.role !== 'brand') return jsonError(403, 'Forbidden');

  const supabase = await createClient();

  try {
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status, target_sport, platforms, created_at')
      .eq('brand_id', user.userId);
    if (campaignError) throw new Error(campaignError.message);

    const campaignIds = (campaigns ?? []).map((c) => String(c.id));
    const [applicationRes, offerRes, deals] = await Promise.all([
      campaignIds.length
        ? supabase
            .from('applications')
            .select('id, campaign_id, athlete_id, status, created_at')
            .in('campaign_id', campaignIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('offers')
        .select('id, athlete_id, campaign_id, status, structured_draft, created_at')
        .eq('brand_id', user.userId),
      listDealsForCurrentUser(),
    ]);

    if (applicationRes.error) throw new Error(applicationRes.error.message);
    if (offerRes.error) throw new Error(offerRes.error.message);

    const campaignStatus: StatusCount = {};
    const applicationStatus: StatusCount = {};
    const offerStatus: StatusCount = {};
    const dealStatus: StatusCount = {};
    const sportDistribution: StatusCount = {};
    const channelMix: StatusCount = {};
    const athleteIds = new Set<string>();
    let pipelineValueCents = 0;

    for (const c of campaigns ?? []) {
      increment(campaignStatus, String(c.status ?? ''));
      increment(sportDistribution, String(c.target_sport ?? 'All Sports'));
      for (const platform of Array.isArray(c.platforms) ? c.platforms : []) {
        if (typeof platform === 'string') increment(channelMix, platform);
      }
    }

    for (const a of applicationRes.data ?? []) {
      increment(applicationStatus, String(a.status ?? ''));
      if (a.athlete_id) athleteIds.add(String(a.athlete_id));
    }

    for (const o of offerRes.data ?? []) {
      increment(offerStatus, String(o.status ?? ''));
      if (o.athlete_id) athleteIds.add(String(o.athlete_id));
      pipelineValueCents += estimateOfferAmountCents(o.structured_draft);
    }

    for (const d of deals) {
      increment(dealStatus, String(d.status ?? ''));
      if (d.athleteUserId) athleteIds.add(String(d.athleteUserId));
    }

    return NextResponse.json({
      totals: {
        campaigns: campaigns?.length ?? 0,
        applications: applicationRes.data?.length ?? 0,
        offers: offerRes.data?.length ?? 0,
        deals: deals.length,
        athletes: athleteIds.size,
        pipelineValueCents,
        currency: 'USD',
      },
      campaignStatus,
      applicationStatus,
      offerStatus,
      dealStatus,
      sportDistribution,
      channelMix,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load brand analytics';
    return jsonError(500, msg);
  }
}

export const dynamic = 'force-dynamic';
