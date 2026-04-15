import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import {
  deleteCampaignById,
  getCampaignById,
  listApplicationsForCampaign,
  updateCampaign,
} from '@/lib/campaigns/repository';
import {
  applicationToJSON,
  athletePublicCampaignJSON,
  campaignToJSON,
} from '@/lib/campaigns/serialization';
import {
  formatCampaignPublishIssues,
  resolveCampaignPublishPolicy,
  validateCampaignPublish,
} from '@/lib/campaigns/publishValidation';
import {
  mergeCampaignBriefV2Patch,
} from '@/lib/campaigns/campaignBriefV2Mapper';
import { CampaignStatusTransitionError } from '@/lib/campaigns/stateTransitions';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import {
  athleteMaySendOnApplication,
  athleteMayViewApplicationThread,
} from '@/lib/chat/messagingEligibility';
import { getThreadByApplicationId } from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };
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

function deriveRuntimePatchFromBrief(briefV2: Record<string, unknown>): Record<string, unknown> {
  const strategy = (briefV2.strategy as Record<string, unknown> | undefined) ?? {};
  const sourcing = (briefV2.sourcingVisibility as Record<string, unknown> | undefined) ?? {};
  const review = (briefV2.reviewLaunch as Record<string, unknown> | undefined) ?? {};
  const template = (briefV2.templateMeta as Record<string, unknown> | undefined) ?? {};
  const visibility = sourcing.visibility === 'public' ? 'Public' : 'Private';
  const acceptApplications = sourcing.acceptApplications !== false;
  const workflowPresetSource =
    template.source === 'system' || template.source === 'org' ? 'template' : 'scratch';
  return {
    name: String(strategy.campaignName ?? ''),
    visibility,
    acceptApplications,
    workflowPresetSource,
    workflowPublishReviewConfirmed: review.reviewConfirmed === true,
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  const user = { userId: session.id, role: session.role };

  const { id } = await context.params;
  const campaign = await getCampaignById(id);
  if (!campaign) {
    return jsonError(404, 'Not found');
  }

  if (user.role === 'brand' && campaign.brandUserId === user.userId) {
    const applications = await listApplicationsForCampaign(id);
    const json = campaignToJSON(campaign);
    return NextResponse.json({
      campaign: json,
      campaignBriefV2: json.campaignBriefV2,
      applications: applications.map(applicationToJSON),
    });
  }

  if (user.role === 'athlete') {
    const applications = await listApplicationsForCampaign(id);
    const mine = applications.filter((a) => a.athleteUserId === user.userId);
    const hasApplication = mine.length > 0;
    if (campaign.visibility !== 'Public' && !hasApplication) {
      return jsonError(403, 'Forbidden');
    }
    const json = athletePublicCampaignJSON(campaign);
    const myApp = mine[0] ?? null;
    let applicationMessaging: { canViewThread: boolean; canSend: boolean } | null = null;
    if (myApp) {
      const snap = await readLocalCampaignStore();
      const offers = snap.offers ?? [];
      const appId = myApp._id != null ? String(myApp._id) : '';
      const existingThread = appId
        ? await getThreadByApplicationId(supabase, appId)
        : null;
      const brandId = String(campaign.brandUserId ?? '');
      const canSend = athleteMaySendOnApplication(myApp, offers);
      const canViewThread = await athleteMayViewApplicationThread(
        supabase,
        myApp,
        brandId,
        offers,
        existingThread?.id ?? null
      );
      applicationMessaging = { canViewThread, canSend };
    }
    return NextResponse.json({
      campaign: json,
      campaignBriefV2: json.campaignBriefV2,
      myApplication: myApp ? applicationToJSON(myApp) : null,
      applicationMessaging,
    });
  }

  return jsonError(403, 'Forbidden');
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  const user = { userId: session.id, role: session.role };
  if (user.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const forbidden = OFFER_OWNED_FIELDS.filter((key) => body[key] !== undefined);
  if (forbidden.length > 0) {
    return jsonError(400, `Campaign cannot include offer-owned fields: ${forbidden.join(', ')}`);
  }

  const existing = await getCampaignById(id);
  if (!existing) {
    return jsonError(404, 'Not found');
  }
  if (existing.brandUserId !== user.userId) {
    return jsonError(403, 'Forbidden');
  }

  const patch: Record<string, unknown> = {};
  const intent =
    body.intent === 'draft' ? 'draft' : body.intent === 'publish' ? 'publish' : 'update';
  const rawV2 = body.campaignBriefV2;
  const hasV2 = rawV2 !== undefined && rawV2 !== null;
  const hasStoredBrief =
    existing.campaignBriefV2 != null &&
    typeof existing.campaignBriefV2 === 'object' &&
    !Array.isArray(existing.campaignBriefV2);

  if (intent === 'draft') {
    if (!hasV2) {
      return jsonError(400, 'campaignBriefV2 is required for draft saves in V2 mode');
    }
    const baselineBrief = hasStoredBrief ? existing.campaignBriefV2 : {};
    const briefV2 = mergeCampaignBriefV2Patch(baselineBrief, rawV2);
    patch.campaignBriefV2 = briefV2;
    Object.assign(patch, deriveRuntimePatchFromBrief(briefV2 as Record<string, unknown>));
    patch.status = 'Draft';
  } else if (intent === 'publish') {
    if (existing.status !== 'Draft') {
      return jsonError(400, 'Only draft campaigns can be published with intent publish');
    }
    if (!hasV2 && !hasStoredBrief) {
      return jsonError(400, 'campaignBriefV2 is required for publish in V2 mode');
    }
    const baselineBrief = hasStoredBrief ? existing.campaignBriefV2 : {};
    const briefV2 = hasV2
      ? mergeCampaignBriefV2Patch(baselineBrief, rawV2)
      : (baselineBrief as Record<string, unknown>);
    patch.campaignBriefV2 = briefV2;
    Object.assign(patch, deriveRuntimePatchFromBrief(briefV2 as Record<string, unknown>));
    patch.status = patch.acceptApplications ? 'Open for Applications' : 'Ready to Launch';
  } else {
    if (typeof body.status === 'string') patch.status = body.status;
    if (typeof body.acceptApplications === 'boolean') patch.acceptApplications = body.acceptApplications;
    if (hasV2) {
      const baselineBrief = hasStoredBrief ? existing.campaignBriefV2 : {};
      const briefV2 = mergeCampaignBriefV2Patch(baselineBrief, rawV2);
      patch.campaignBriefV2 = briefV2;
      Object.assign(patch, deriveRuntimePatchFromBrief(briefV2 as Record<string, unknown>));
    }
  }

  let publishValidationResult: ReturnType<typeof validateCampaignPublish> | null = null;
  if (intent === 'publish') {
    const mergedForPublish = { ...existing, ...patch };
    publishValidationResult = validateCampaignPublish(mergedForPublish as Record<string, unknown>, {
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

  if (Object.keys(patch).length === 0) {
    return jsonError(400, 'No valid fields');
  }

  try {
    const updated = await updateCampaign(id, user.userId, patch);
    if (!updated) {
      return jsonError(404, 'Not found or forbidden');
    }
    const json = campaignToJSON(updated);
    return NextResponse.json({
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
    });
  } catch (e) {
    if (e instanceof CampaignStatusTransitionError) {
      return jsonError(400, e.message);
    }
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return jsonError(400, msg);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  if (session.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  const { id } = await context.params;
  const existing = await getCampaignById(id);
  if (!existing) {
    return jsonError(404, 'Not found');
  }
  if (existing.brandUserId !== session.id) {
    return jsonError(403, 'Forbidden');
  }
  if (existing.status !== 'Draft') {
    return jsonError(400, 'Only draft campaigns can be discarded.');
  }

  const ok = await deleteCampaignById(id, session.id);
  if (!ok) {
    return jsonError(404, 'Not found or forbidden');
  }
  return NextResponse.json({ ok: true });
}
