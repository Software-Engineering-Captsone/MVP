import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createCampaign, listCampaignsForBrand, listOpenCampaignsForAthlete } from '@/lib/campaigns/repository';
import { deriveCampaignStatusFromSubmission } from '@/lib/campaigns/campaignStatusDerivation';
import { campaignToJSON } from '@/lib/campaigns/serialization';
import { createClient } from '@/lib/supabase/server';

/**
 * Ensure a brand_profiles row exists for this user. campaigns.brand_id has a
 * FK to brand_profiles.brand_id; without this row the insert fails with
 * a 23503. Brands who skipped the brand onboarding wizard still get unblocked —
 * they can fill in details later from their profile page.
 */
async function ensureBrandProfile(userId: string, brandDisplayName: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('brand_profiles')
    .upsert(
      { brand_id: userId, company_name: brandDisplayName },
      { onConflict: 'brand_id', ignoreDuplicates: true }
    );
  if (error) return error.message;
  return null;
}

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
  const intent = body.intent === 'publish' ? 'publish' : 'draft';
  const status = deriveCampaignStatusFromSubmission(body, { intent });

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

  // Guarantee the brand_profiles row exists before inserting the campaign.
  // Without it, the FK campaigns.brand_id → brand_profiles.brand_id fails.
  const brandProfileErr = await ensureBrandProfile(
    user.userId,
    String(body.brandDisplayName ?? '')
  );
  if (brandProfileErr) {
    return NextResponse.json(
      {
        error: `Could not initialise brand profile: ${brandProfileErr}`,
        hint: 'Complete brand onboarding from Profile settings, then retry.',
      },
      { status: 400 }
    );
  }

  try {
    const row = await createCampaign(payload);
    return NextResponse.json({ campaign: campaignToJSON(row) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
