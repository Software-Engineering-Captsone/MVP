import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import {
  createOfferDraftsFromApplications,
  getCampaignById,
  listOffersForCampaign,
} from '@/lib/campaigns/repository';
import { jsonError } from '@/lib/api/jsonError';
import { offerToJSON } from '@/lib/campaigns/serialization';

type RouteContext = { params: Promise<{ id: string }> };

/** Brand: list campaign-linked offers (drafts included) for OfferWizard / candidate row links. */
export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');
  if (user.role !== 'brand') return jsonError(403, 'Forbidden');

  const { id: campaignId } = await context.params;
  const campaign = await getCampaignById(campaignId);
  if (!campaign || campaign.brandUserId !== user.userId) {
    return jsonError(404, 'Not found');
  }

  try {
    const offers = await listOffersForCampaign(campaignId, user.userId);
    return NextResponse.json({
      offers: offers.map((o) => ({
        id: String(o._id),
        applicationId: o.applicationId ?? null,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list offers';
    return jsonError(500, msg);
  }
}

/** Brand: create draft offer rows for the given application ids (campaign handoff). */
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');
  if (user.role !== 'brand') return jsonError(403, 'Forbidden');

  const { id: campaignId } = await context.params;
  const campaign = await getCampaignById(campaignId);
  if (!campaign || campaign.brandUserId !== user.userId) {
    return jsonError(404, 'Not found');
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const raw = body.applicationIds;
  if (!Array.isArray(raw) || raw.length === 0) {
    return jsonError(400, 'applicationIds must be a non-empty array');
  }
  const applicationIds = raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (applicationIds.length === 0) {
    return jsonError(400, 'applicationIds must contain at least one string id');
  }

  try {
    const created = await createOfferDraftsFromApplications({
      brandUserId: user.userId,
      campaignId,
      applicationIds,
    });
    return NextResponse.json({ offers: created.map(offerToJSON) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Offer handoff failed';
    return jsonError(400, msg);
  }
}
