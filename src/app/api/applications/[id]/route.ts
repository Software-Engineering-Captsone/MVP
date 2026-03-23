import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/campaigns/getAuthUser';
import {
  getApplicationById,
  getCampaignById,
  updateApplicationStatus,
} from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED = new Set(['shortlisted', 'approved', 'declined']);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = getAuthUserFromRequest(request);
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

  const status = body.status;
  if (typeof status !== 'string' || !ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    const updated = await updateApplicationStatus(
      id,
      user.userId,
      status as 'shortlisted' | 'approved' | 'declined'
    );
    if (!updated) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }
    return NextResponse.json({ application: applicationToJSON(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const app = await getApplicationById(id);
  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const campaign = await getCampaignById(String(app.campaignId));
  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isBrand = user.role === 'brand' && campaign.brandUserId === user.userId;
  const isAthlete = user.role === 'athlete' && app.athleteUserId === user.userId;
  if (!isBrand && !isAthlete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ application: applicationToJSON(app) });
}
