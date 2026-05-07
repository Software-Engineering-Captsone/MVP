import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import {
  createCampaign,
  listApplicationsForCampaigns,
  listCampaignsForBrand,
  listOpenCampaignsForAthlete,
  type StoredCampaign,
} from '@/lib/campaigns/repository';
import { deriveCampaignStatusFromSubmission } from '@/lib/campaigns/campaignStatusDerivation';
import { campaignBriefV2ToLegacy } from '@/lib/campaigns/campaignBriefV2Mapper';
import { campaignToJSON } from '@/lib/campaigns/serialization';
import { createClient } from '@/lib/supabase/server';
import { enrichApplicationsForBrandCampaigns } from '@/lib/campaigns/applicationEnrichment';

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
    campaignBriefV2: isRecord(body.campaignBriefV2) ? body.campaignBriefV2 : null,
    status: deriveCampaignStatusFromSubmission({ ...body, ...legacyFromBrief }, { intent }),
  };
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseOffsetCursor(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function parseMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const match = normalized.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function campaignCompRange(campaign: StoredCampaign): { min: number | null; max: number | null } {
  const budget = String(campaign.budget ?? '');
  const values = [...budget.matchAll(/\$?\s*([\d,]+(?:\.\d+)?)/g)]
    .map((m) => parseMoney(m[1]))
    .filter((n): n is number => n != null);
  if (values.length === 0) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function filterAthleteCampaigns(campaigns: StoredCampaign[], searchParams: URLSearchParams): StoredCampaign[] {
  const sport = normalizeText(searchParams.get('sport'));
  const category = normalizeText(searchParams.get('category'));
  const platform = normalizeText(searchParams.get('platform'));
  const location = normalizeText(searchParams.get('location'));
  const compMin = parseMoney(searchParams.get('compMin'));
  const compMax = parseMoney(searchParams.get('compMax'));

  return campaigns.filter((campaign) => {
    if (sport) {
      const campaignSport = normalizeText(campaign.sport);
      if (campaignSport !== sport && campaignSport !== 'all sports') return false;
    }

    if (platform) {
      const platforms = (campaign.platforms ?? []).map(normalizeText);
      if (!platforms.some((p) => p.includes(platform))) return false;
    }

    if (location && !normalizeText(campaign.location).includes(location)) return false;

    if (category) {
      const haystack = [
        campaign.name,
        campaign.subtitle,
        campaign.goal,
        campaign.packageName,
        campaign.brief,
        ...(campaign.packageDetails ?? []),
        ...(campaign.platforms ?? []),
      ]
        .map(normalizeText)
        .join(' ');
      if (!haystack.includes(category)) return false;
    }

    if (compMin != null || compMax != null) {
      const range = campaignCompRange(campaign);
      if (range.min == null && range.max == null) return false;
      const max = range.max ?? range.min ?? 0;
      const min = range.min ?? range.max ?? 0;
      if (compMin != null && max < compMin) return false;
      if (compMax != null && min > compMax) return false;
    }

    return true;
  });
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (user.role === 'brand') {
      const rows = await listCampaignsForBrand(user.userId);
      const applications = await listApplicationsForCampaigns(rows.map((row) => row._id));
      const enrichedApplications = await enrichApplicationsForBrandCampaigns(applications);
      const applicationsByCampaign = enrichedApplications.reduce<Record<string, typeof enrichedApplications>>(
        (acc, application) => {
          const campaignId = String(application.campaignId ?? '');
          if (!campaignId) return acc;
          acc[campaignId] ??= [];
          acc[campaignId].push(application);
          return acc;
        },
        {},
      );
      return NextResponse.json({
        campaigns: rows.map(campaignToJSON),
        applicationsByCampaign,
      });
    }
    const rows = await listOpenCampaignsForAthlete();
    const filtered = filterAthleteCampaigns(rows, request.nextUrl.searchParams);
    const limit = parsePositiveInt(request.nextUrl.searchParams.get('limit'), filtered.length || 20, 50);
    const offset = parseOffsetCursor(request.nextUrl.searchParams.get('cursor'));
    const page = filtered.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    return NextResponse.json({
      campaigns: page.map(campaignToJSON),
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
      total: filtered.length,
    });
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
