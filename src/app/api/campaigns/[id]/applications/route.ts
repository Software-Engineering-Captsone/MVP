import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/campaigns/getAuthUser';
import {
  createApplication,
  getCampaignById,
  listApplicationsForCampaign,
} from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const campaign = await getCampaignById(id);
  if (!campaign || campaign.brandUserId !== user.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const applications = await listApplicationsForCampaign(id);
  return NextResponse.json({ applications: applications.map(applicationToJSON) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'athlete') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const athleteSnapshot = (body.athleteSnapshot as Record<string, string>) ?? {};
  const pitch = typeof body.pitch === 'string' ? body.pitch : '';

  try {
    const result = await createApplication({
      campaignId: id,
      athleteUserId: user.userId,
      pitch,
      athleteSnapshot: {
        name: athleteSnapshot.name ?? '',
        sport: athleteSnapshot.sport ?? '',
        school: athleteSnapshot.school ?? '',
        image: athleteSnapshot.image ?? '',
        followers: athleteSnapshot.followers ?? '—',
        engagement: athleteSnapshot.engagement ?? '—',
      },
    });

    if (result.error === 'duplicate') {
      return NextResponse.json(
        { error: 'Already applied', application: applicationToJSON(result.application) },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { application: applicationToJSON(result.application) },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to apply';
    const status = msg === 'Campaign not found' ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
