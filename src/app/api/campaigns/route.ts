import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createCampaign, listCampaignsForBrand, listOpenCampaignsForAthlete } from '@/lib/campaigns/repository';
import { deriveCampaignStatusFromSubmission } from '@/lib/campaigns/campaignStatusDerivation';
import { campaignBriefV2ToLegacy } from '@/lib/campaigns/campaignBriefV2Mapper';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCampaignCreatePayload(
  body: Record<string, unknown>,
  brandUserId: string,
): Record<string, unknown> {
  const legacyFromBrief = isRecord(body.campaignBriefV2)
    ? campaignBriefV2ToLegacy(body.campaignBriefV2 as Parameters<typeof campaignBriefV2ToLegacy>[0])
    : {};
  const merged = { ...legacyFromBrief, ...body };
  const acceptApplications = merged.acceptApplications !== false;
  const intent = body.intent === 'publish' ? 'publish' : 'draft';

  return {
    brandUserId,
    brandDisplayName: String(merged.brandDisplayName ?? ''),
    name: merged.name,
    subtitle: merged.subtitle ?? '',
    packageName: merged.packageName ?? '',
    packageId: merged.packageId ?? '',
    goal: merged.goal ?? '',
    brief: merged.brief ?? '',
    budget: merged.budgetHint ?? merged.budget ?? '',
    duration: merged.duration ?? '',
    location: merged.location ?? '',
    startDate: merged.startDate ?? '',
    endDate: merged.endDate ?? '',
    visibility: merged.visibility === 'Private' ? 'Private' : 'Public',
    acceptApplications,
    sport: merged.sport ?? 'All Sports',
    genderFilter: merged.genderFilter ?? 'Any',
    followerMin:
      typeof merged.followerMin === 'number'
        ? merged.followerMin
        : Number(merged.followerMin) || 0,
    packageDetails: Array.isArray(merged.packageDetails) ? merged.packageDetails : [],
    platforms: Array.isArray(merged.platforms) ? merged.platforms : [],
    image: typeof merged.image === 'string' && merged.image.trim() ? merged.image.trim() : '',
    status: deriveCampaignStatusFromSubmission({ ...body, ...legacyFromBrief }, { intent }),
  };
}

export async function GET() {
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

  const payload = normalizeCampaignCreatePayload(body, user.userId);

  // Guarantee the brand_profiles row exists before inserting the campaign.
  // Without it, the FK campaigns.brand_id → brand_profiles.brand_id fails.
  const brandProfileErr = await ensureBrandProfile(
    user.userId,
    String(payload.brandDisplayName ?? '')
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
