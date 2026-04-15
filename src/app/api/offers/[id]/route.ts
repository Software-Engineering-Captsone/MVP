import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import {
  getOfferByIdForAthlete,
  getOfferByIdForBrand,
  updateOfferDraftFields,
} from '@/lib/campaigns/repository';
import { offerToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

function buildReadOnlyContext(args: {
  campaign: Record<string, unknown> | null;
  application: Record<string, unknown> | null;
  offer: Record<string, unknown>;
}): Record<string, unknown> {
  const c = args.campaign;
  const a = args.application;
  const snap = a?.athleteSnapshot as Record<string, unknown> | undefined;
  const sd = args.offer.structuredDraft as Record<string, unknown> | undefined;
  const oc =
    sd && typeof sd === 'object' && !Array.isArray(sd)
      ? (sd.originContext as Record<string, unknown> | undefined)
      : undefined;
  return {
    campaignName: typeof c?.name === 'string' ? c.name : '',
    campaignBrief: typeof c?.brief === 'string' ? c.brief : '',
    athleteUserId: typeof args.offer.athleteUserId === 'string' ? args.offer.athleteUserId : '',
    athleteSnapshot: {
      name: typeof snap?.name === 'string' ? snap.name : '',
      sport: typeof snap?.sport === 'string' ? snap.sport : '',
      school: typeof snap?.school === 'string' ? snap.school : '',
      image: typeof snap?.image === 'string' ? snap.image : '',
      followers: typeof snap?.followers === 'string' ? snap.followers : '',
      engagement: typeof snap?.engagement === 'string' ? snap.engagement : '',
    },
    chatThreadId:
      oc && typeof oc.chatThreadId === 'string' && oc.chatThreadId.trim()
        ? oc.chatThreadId.trim()
        : null,
  };
}

function buildAthleteOfferDetail(args: {
  offer: Record<string, unknown>;
  campaign: Record<string, unknown> | null;
  context: Record<string, unknown>;
  snapshot: Awaited<ReturnType<typeof readLocalCampaignStore>>;
}): Record<string, unknown> {
  const structuredDraft = args.offer.structuredDraft as Record<string, unknown> | undefined;
  const wizard =
    structuredDraft && typeof structuredDraft.wizard === 'object' && !Array.isArray(structuredDraft.wizard)
      ? (structuredDraft.wizard as Record<string, unknown>)
      : null;
  const basics =
    wizard && typeof wizard.basics === 'object' && !Array.isArray(wizard.basics)
      ? (wizard.basics as Record<string, unknown>)
      : null;

  const dueDate = typeof basics?.dueDate === 'string' ? basics.dueDate : '';
  const detailText = typeof basics?.details === 'string' ? basics.details : '';
  const amount = typeof basics?.amount === 'string' ? basics.amount.trim() : '';
  const notes = typeof args.offer.notes === 'string' ? args.offer.notes : '';
  const compensation = amount || notes || 'Compensation details shared by the brand';
  const campaignName =
    typeof args.campaign?.name === 'string' && args.campaign.name
      ? args.campaign.name
      : null;

  const offerId = typeof args.offer._id === 'string' ? args.offer._id : '';
  const linkedDeal = args.snapshot.deals.find((d) => String(d.offerId) === offerId) ?? null;
  const contractPreview =
    linkedDeal != null
      ? args.snapshot.dealContracts.find((c) => String(c._id) === String(linkedDeal.contractId)) ?? null
      : null;

  return {
    title: typeof basics?.offerName === 'string' ? basics.offerName : '',
    shortDescription: detailText ? detailText.slice(0, 180) : notes.slice(0, 180),
    fullDescription: detailText || notes || '',
    campaignName,
    campaignContext:
      typeof args.context.campaignBrief === 'string' && args.context.campaignBrief
        ? args.context.campaignBrief
        : '',
    timeline: {
      deadline: dueDate || null,
    },
    expectations: {
      brandApprovalRequired:
        wizard &&
        typeof wizard.contentControl === 'object' &&
        !Array.isArray(wizard.contentControl) &&
        (wizard.contentControl as Record<string, unknown>).brandApprovalRequired === true,
      revisionRounds:
        wizard &&
        typeof wizard.contentControl === 'object' &&
        !Array.isArray(wizard.contentControl) &&
        typeof (wizard.contentControl as Record<string, unknown>).revisionRounds === 'number'
          ? (wizard.contentControl as Record<string, unknown>).revisionRounds
          : null,
    },
    deliverables:
      wizard &&
      typeof wizard.ugc === 'object' &&
      !Array.isArray(wizard.ugc) &&
      typeof (wizard.ugc as Record<string, unknown>).assetCount === 'number'
        ? [
            {
              title: 'UGC Deliverables',
              quantity: (wizard.ugc as Record<string, unknown>).assetCount,
              platforms: Array.isArray((wizard.ugc as Record<string, unknown>).primaryPlatforms)
                ? ((wizard.ugc as Record<string, unknown>).primaryPlatforms as unknown[]).map((p) => String(p))
                : [],
            },
          ]
        : [],
    compensation: {
      summary: compensation,
      amount: amount || null,
    },
    contractPreview:
      contractPreview == null
        ? null
        : {
            status: contractPreview.status,
            fileUrl:
              typeof contractPreview.fileUrl === 'string' && contractPreview.fileUrl
                ? contractPreview.fileUrl
                : typeof contractPreview.fileRef === 'string' && contractPreview.fileRef
                  ? contractPreview.fileRef
                  : null,
            signedAt: contractPreview.signedAt ?? null,
          },
    createdAt: args.offer.createdAt ?? null,
  };
}

/**
 * GET /api/offers/[id] — single offer draft + read-only campaign/application context for the wizard.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  const { id: offerId } = await context.params;
  const result =
    session.role === 'brand'
      ? await getOfferByIdForBrand(offerId, session.id)
      : await getOfferByIdForAthlete(offerId, session.id);
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }

  const snapshot = await readLocalCampaignStore();
  const offerRow = result.offer as Record<string, unknown>;
  const readOnlyContext = buildReadOnlyContext({
    campaign: result.campaign as Record<string, unknown> | null,
    application: result.application as Record<string, unknown> | null,
    offer: offerRow,
  });
  return NextResponse.json({
    offer: offerToJSON(result.offer, snapshot.campaigns),
    readOnlyContext,
    ...(session.role === 'athlete'
      ? {
          athleteView: buildAthleteOfferDetail({
            offer: offerRow,
            campaign: result.campaign as Record<string, unknown> | null,
            context: readOnlyContext,
            snapshot,
          }),
        }
      : {}),
  });
}

/**
 * PATCH /api/offers/[id] — update notes and/or structured wizard payload (never mutates campaign rows).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  if (session.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  const { id: offerId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const notes = typeof body.notes === 'string' ? body.notes : undefined;
  const structuredDraft = body.structuredDraft;

  if (notes === undefined && structuredDraft === undefined) {
    return jsonError(400, 'Provide notes and/or structuredDraft in the request body');
  }

  const result = await updateOfferDraftFields(offerId, session.id, {
    ...(notes !== undefined ? { notes } : {}),
    ...(structuredDraft !== undefined ? { structuredDraft } : {}),
  });

  if (!result.ok) {
    return jsonError(result.status, result.error);
  }

  const snapshot = await readLocalCampaignStore();
  return NextResponse.json({
    offer: offerToJSON(result.offer, snapshot.campaigns),
  });
}
