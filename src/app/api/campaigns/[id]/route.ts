import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { deriveCampaignStatusFromSubmission } from '@/lib/campaigns/campaignStatusDerivation';
import { campaignBriefV2ToLegacy } from '@/lib/campaigns/campaignBriefV2Mapper';
import {
  CampaignUpdatePatch,
  deleteDraftCampaign,
  getCampaignById,
  listApplicationsForCampaign,
  updateCampaign,
} from '@/lib/campaigns/repository';
import {
  applicationToJSON,
  athletePublicCampaignJSON,
  campaignToJSON,
} from '@/lib/campaigns/serialization';

type RouteContext = { params: Promise<{ id: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeCampaignPatch(body: Record<string, unknown>): CampaignUpdatePatch {
  const legacyFromBrief = isRecord(body.campaignBriefV2)
    ? campaignBriefV2ToLegacy(body.campaignBriefV2 as Parameters<typeof campaignBriefV2ToLegacy>[0])
    : {};
  const merged = { ...legacyFromBrief, ...body };
  const patch: CampaignUpdatePatch = {};

  if (hasOwn(merged, 'name')) patch.name = String(merged.name ?? '');
  if (hasOwn(merged, 'subtitle')) patch.subtitle = String(merged.subtitle ?? '');
  if (hasOwn(merged, 'packageName')) patch.packageName = String(merged.packageName ?? '');
  if (hasOwn(merged, 'packageId')) patch.packageId = String(merged.packageId ?? '');
  if (hasOwn(merged, 'goal')) patch.goal = String(merged.goal ?? '');
  if (hasOwn(merged, 'brief')) patch.brief = String(merged.brief ?? '');
  if (hasOwn(merged, 'duration')) patch.duration = String(merged.duration ?? '');
  if (hasOwn(merged, 'location')) patch.location = String(merged.location ?? '');
  if (hasOwn(merged, 'startDate')) patch.startDate = String(merged.startDate ?? '');
  if (hasOwn(merged, 'endDate')) patch.endDate = String(merged.endDate ?? '');
  if (hasOwn(merged, 'visibility')) patch.visibility = merged.visibility === 'Private' ? 'Private' : 'Public';
  if (typeof merged.acceptApplications === 'boolean') patch.acceptApplications = merged.acceptApplications;
  if (hasOwn(merged, 'sport')) patch.sport = String(merged.sport ?? 'All Sports');
  if (hasOwn(merged, 'genderFilter')) patch.genderFilter = String(merged.genderFilter ?? 'Any');
  if (hasOwn(merged, 'followerMin')) {
    patch.followerMin =
      typeof merged.followerMin === 'number'
        ? merged.followerMin
        : Number(merged.followerMin) || 0;
  }
  if (hasOwn(merged, 'packageDetails')) {
    patch.packageDetails = Array.isArray(merged.packageDetails) ? merged.packageDetails.map(String) : [];
  }
  if (hasOwn(merged, 'platforms')) {
    patch.platforms = Array.isArray(merged.platforms) ? merged.platforms.map(String) : [];
  }
  if (hasOwn(merged, 'image')) {
    patch.image = typeof merged.image === 'string' && merged.image.trim() ? merged.image.trim() : '';
  }
  if (hasOwn(merged, 'budgetHint') || hasOwn(merged, 'budget')) {
    patch.budget = String(merged.budgetHint ?? merged.budget ?? '');
  }

  const intent = body.intent === 'publish' ? 'publish' : body.intent === 'draft' ? 'draft' : null;
  if (intent) {
    patch.status = deriveCampaignStatusFromSubmission({ ...body, ...legacyFromBrief }, { intent });
  } else if (typeof body.status === 'string') {
    patch.status = body.status;
  }

  return patch;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const campaign = await getCampaignById(id);
  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (user.role === 'brand' && campaign.brandUserId === user.userId) {
    const applications = await listApplicationsForCampaign(id);
    return NextResponse.json({
      campaign: campaignToJSON(campaign),
      applications: applications.map(applicationToJSON),
    });
  }

  if (user.role === 'athlete') {
    const applications = await listApplicationsForCampaign(id);
    const mine = applications.filter((a) => a.athleteUserId === user.userId);
    const hasApplication = mine.length > 0;
    if (campaign.visibility !== 'Public' && !hasApplication) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({
      campaign: athletePublicCampaignJSON(campaign),
      myApplication: mine[0] ? applicationToJSON(mine[0]) : null,
    });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch = normalizeCampaignPatch(body);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  try {
    const updated = await updateCampaign(id, user.userId, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }
    return NextResponse.json({ campaign: campaignToJSON(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const deleted = await deleteDraftCampaign(id, user.userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Draft not found or forbidden' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not discard draft';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
