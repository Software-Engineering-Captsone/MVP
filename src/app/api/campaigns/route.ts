import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import {
  createCampaign,
  listCampaignsForBrand,
  listOpenCampaignsForAthletePage,
  type AthleteOpenCampaignFilters,
} from '@/lib/campaigns/repository';
import {
  formatCampaignPublishIssues,
  resolveCampaignPublishPolicy,
  validateCampaignPublish,
} from '@/lib/campaigns/publishValidation';
import {
  normalizeCampaignBriefV2,
} from '@/lib/campaigns/campaignBriefV2Mapper';
import { campaignToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';

const OFFER_OWNED_FIELDS = [
  'compensation',
  'offerAmount',
  'revisionCount',
  'revisionCost',
  'contract',
  'contractFile',
  'athleteId',
  'negotiatedTerms',
] as const;

function findForbiddenOfferFields(body: Record<string, unknown>): string[] {
  return OFFER_OWNED_FIELDS.filter((key) => body[key] !== undefined);
}

function parseOptionalNonEmpty(sp: URLSearchParams, key: string): string | null {
  const v = sp.get(key);
  if (v == null) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

function parseOptionalUsdInt(sp: URLSearchParams, key: string): number | null {
  const v = sp.get(key);
  if (v == null || v.trim() === '') return null;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function athleteFiltersFromSearchParams(sp: URLSearchParams): AthleteOpenCampaignFilters | null {
  const sport = parseOptionalNonEmpty(sp, 'sport');
  const category = parseOptionalNonEmpty(sp, 'category');
  const platform = parseOptionalNonEmpty(sp, 'platform');
  const location = parseOptionalNonEmpty(sp, 'location');
  let compensationMinUsd = parseOptionalUsdInt(sp, 'compMin');
  let compensationMaxUsd = parseOptionalUsdInt(sp, 'compMax');
  if (
    compensationMinUsd != null &&
    compensationMaxUsd != null &&
    compensationMinUsd > compensationMaxUsd
  ) {
    const tmp = compensationMinUsd;
    compensationMinUsd = compensationMaxUsd;
    compensationMaxUsd = tmp;
  }
  const out: AthleteOpenCampaignFilters = {
    ...(sport != null ? { sport } : {}),
    ...(category != null ? { category } : {}),
    ...(platform != null ? { platform } : {}),
    ...(location != null ? { location } : {}),
    ...(compensationMinUsd != null ? { compensationMinUsd } : {}),
    ...(compensationMaxUsd != null ? { compensationMaxUsd } : {}),
  };
  return Object.keys(out).length > 0 ? out : null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = { userId: session.id, role: session.role };

  try {
    if (user.role === 'brand') {
      const rows = await listCampaignsForBrand(user.userId);
      return NextResponse.json({ campaigns: rows.map(campaignToJSON) });
    }
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    let limit = 20;
    if (limitParam != null && limitParam.trim() !== '') {
      const n = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(n)) {
        limit = Math.min(50, Math.max(1, n));
      }
    }
    const cursor = url.searchParams.get('cursor');
    const filters = athleteFiltersFromSearchParams(url.searchParams);
    const { campaigns: rows, nextCursor } = await listOpenCampaignsForAthletePage({
      cursor,
      limit,
      filters,
    });
    return NextResponse.json({
      campaigns: rows.map(campaignToJSON),
      nextCursor,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    if (msg === 'Invalid cursor') {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = { userId: session.id, role: session.role };
  if (user.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const forbidden = findForbiddenOfferFields(body);
  if (forbidden.length > 0) {
    return NextResponse.json(
      {
        error: `Campaign cannot include offer-owned fields: ${forbidden.join(', ')}`,
      },
      { status: 400 }
    );
  }

  const rawV2 = body.campaignBriefV2;
  if (rawV2 === undefined || rawV2 === null) {
    return NextResponse.json(
      { error: 'campaignBriefV2 is required for campaign create in V2 mode' },
      { status: 400 }
    );
  }
  const briefV2 = normalizeCampaignBriefV2(rawV2);
  const acceptApplications = briefV2.sourcingVisibility.acceptApplications !== false;
  const visibility = briefV2.sourcingVisibility.visibility === 'public' ? 'Public' : 'Private';
  const workflowPresetSource =
    briefV2.templateMeta?.source === 'system' || briefV2.templateMeta?.source === 'org'
      ? 'template'
      : 'scratch';
  const intent = body.intent === 'draft' ? 'draft' : 'publish';
  const status =
    intent === 'draft'
      ? 'Draft'
      : acceptApplications
        ? 'Active'
        : 'Ready to Launch';

  const payload: Record<string, unknown> = {
    brandUserId: user.userId,
    brandDisplayName: String(body.brandDisplayName ?? ''),
    name: briefV2.strategy.campaignName,
    visibility,
    acceptApplications,
    image: typeof body.image === 'string' && body.image.trim() ? body.image.trim() : '',
    workflowPresetSource,
    workflowPublishReviewConfirmed: briefV2.reviewLaunch.reviewConfirmed === true,
    campaignBriefV2: briefV2,
    status,
  };

  let publishValidationResult: ReturnType<typeof validateCampaignPublish> | null = null;
  if (intent === 'publish') {
    publishValidationResult = validateCampaignPublish(payload, {
      policy: resolveCampaignPublishPolicy(),
    });
    if (publishValidationResult.blockingIssues.length > 0) {
      return jsonError(
        400,
        formatCampaignPublishIssues(publishValidationResult.blockingIssues),
        {
          blockingIssues: publishValidationResult.blockingIssues,
          warningIssues: publishValidationResult.warningIssues,
          issues: publishValidationResult.blockingIssues,
          completenessBySection: publishValidationResult.completenessBySection,
        }
      );
    }
  }

  try {
    const row = await createCampaign(payload);
    const json = campaignToJSON(row);
    return NextResponse.json(
      {
        campaign: json,
        campaignBriefV2: json.campaignBriefV2,
        ...(intent === 'publish' && publishValidationResult
          ? {
              publishValidation: {
                warningIssues: publishValidationResult.warningIssues,
                completenessBySection: publishValidationResult.completenessBySection,
              },
            }
          : {}),
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
