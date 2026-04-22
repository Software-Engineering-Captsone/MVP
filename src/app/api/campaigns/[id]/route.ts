import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import {
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

  const patch: Record<string, unknown> = {};
  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.acceptApplications === 'boolean') patch.acceptApplications = body.acceptApplications;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  try {
    const updated = await updateCampaign(id, user.userId, patch as { status?: string; acceptApplications?: boolean });
    if (!updated) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }
    return NextResponse.json({ campaign: campaignToJSON(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
