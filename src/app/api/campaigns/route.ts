import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createCampaign, listCampaignsForBrand, listOpenCampaignsForAthlete } from '@/lib/campaigns/repository';
import { campaignToJSON } from '@/lib/campaigns/serialization';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (user.role === 'brand') {
      const rows = await listCampaignsForBrand(user.userId);
      return NextResponse.json({ campaigns: rows.map(campaignToJSON) });
    }
    const rows = await listOpenCampaignsForAthlete();
    return NextResponse.json({ campaigns: rows.map(campaignToJSON) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const acceptApplications = body.acceptApplications !== false;
  const status = acceptApplications ? 'Open for Applications' : 'Ready to Launch';

  const payload: Record<string, unknown> = {
    brandUserId: user.userId,
    brandDisplayName: String(body.brandDisplayName ?? ''),
    name: body.name,
    subtitle: body.subtitle ?? '',
    packageName: body.packageName ?? '',
    packageId: body.packageId ?? '',
    goal: body.goal ?? '',
    brief: body.brief ?? '',
    budget: body.budget ?? '',
    duration: body.duration ?? '',
    location: body.location ?? '',
    startDate: body.startDate ?? '',
    endDate: body.endDate ?? '',
    visibility: body.visibility === 'Private' ? 'Private' : 'Public',
    acceptApplications,
    sport: body.sport ?? 'All Sports',
    genderFilter: body.genderFilter ?? 'Any',
    followerMin: typeof body.followerMin === 'number' ? body.followerMin : Number(body.followerMin) || 0,
    packageDetails: Array.isArray(body.packageDetails) ? body.packageDetails : [],
    platforms: Array.isArray(body.platforms) ? body.platforms : [],
    image: typeof body.image === 'string' && body.image.trim() ? body.image.trim() : '',
    status,
  };

  try {
    const row = await createCampaign(payload);
    return NextResponse.json({ campaign: campaignToJSON(row) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
