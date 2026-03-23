import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/campaigns/getAuthUser';
import {
  appendApplicationMessage,
  getApplicationById,
  getCampaignById,
} from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';

type RouteContext = { params: Promise<{ id: string }> };

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

  return NextResponse.json({
    messages: applicationToJSON(app).messages,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Message body required' }, { status: 400 });
  }

  try {
    const { application, error } = await appendApplicationMessage(id, user.userId, text);
    if (error === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (error === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ application: application ? applicationToJSON(application) : null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
