import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import {
  createOfferDraftsFromApplications,
  listOffersForCampaign,
} from '@/lib/campaigns/repository';
import { offerToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/campaigns/[id]/offers — list offer drafts for this campaign (brand owner only).
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  if (session.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  const { id: campaignId } = await context.params;
  const result = await listOffersForCampaign(campaignId, session.id);
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }

  const snapshot = await readLocalCampaignStore();
  return NextResponse.json({
    campaignId,
    offers: result.offers.map((o) => offerToJSON(o, snapshot.campaigns)),
  });
}

/**
 * POST /api/campaigns/[id]/offers — handoff scaffold from campaign + applications to offer drafts.
 *
 * Validation (strict batch):
 * - Caller must be authenticated brand; brandUserId must own the campaign.
 * - Each applicationId must exist, belong to this campaign, and have status `shortlisted`.
 * - Idempotent per (campaignId, applicationId): returns existing draft if already present.
 *
 * Offer rows contain only linkage / ownership / draft status — not execution terms.
 */
function normalizeApplicationIds(body: Record<string, unknown>): string[] {
  const raw = body.applicationIds ?? body.applicationId;
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  return [];
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  if (session.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  const { id: campaignId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const applicationIds = normalizeApplicationIds(body);
  const notes = typeof body.notes === 'string' ? body.notes : '';

  const result = await createOfferDraftsFromApplications(
    campaignId,
    session.id,
    applicationIds,
    notes
  );

  if (!result.ok) {
    return jsonError(result.status, result.error, result.details);
  }

  const snapshot = await readLocalCampaignStore();
  return NextResponse.json({
    campaignId,
    offers: result.offers.map((o) => offerToJSON(o, snapshot.campaigns)),
    count: result.offers.length,
  });
}
