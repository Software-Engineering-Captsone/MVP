import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createClient } from '@/lib/supabase/server';
import { findUserById } from '@/lib/auth/localUserRepository';
import {
  getApplicationById,
  getCampaignById,
  getOfferByIdForAthlete,
  getOfferByIdForBrand,
  updateOfferDraftFields,
  type StoredOffer,
} from '@/lib/campaigns/repository';
import { normalizeStructuredDraft, type OfferWizardState } from '@/lib/campaigns/offerWizardTypes';
import { offerToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';

type RouteContext = { params: Promise<{ offerId: string }> };

type AthleteOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

function pickRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function basicsOf(offer: Record<string, unknown>): Record<string, unknown> | undefined {
  const sd = pickRecord(offer.structuredDraft);
  const wizard = pickRecord(sd?.wizard);
  return pickRecord(wizard?.basics);
}

function extractDeadline(offer: Record<string, unknown>): string | null {
  const basics = basicsOf(offer);
  const dueDate = typeof basics?.dueDate === 'string' ? basics.dueDate.trim() : '';
  return dueDate || null;
}

function computeAthleteStatus(offer: Record<string, unknown>, now: number): AthleteOfferStatus {
  const raw = String(offer.status ?? 'draft');
  if (raw === 'accepted') return 'accepted';
  if (raw === 'declined') return 'declined';
  const deadline = extractDeadline(offer);
  if (raw === 'sent' && deadline) {
    const t = new Date(deadline).getTime();
    if (!Number.isNaN(t) && t < now) return 'expired';
  }
  return 'pending';
}

function shortDescription(offer: Record<string, unknown>): string {
  const basics = basicsOf(offer);
  const details = typeof basics?.details === 'string' ? basics.details.trim() : '';
  const notes = typeof offer.notes === 'string' ? offer.notes.trim() : '';
  const src = details || notes;
  return src.length > 180 ? `${src.slice(0, 177)}...` : src;
}

function compensationSummary(offer: Record<string, unknown>): string {
  const basics = basicsOf(offer);
  const amount = typeof basics?.amount === 'string' ? basics.amount.trim() : '';
  if (amount) return amount;
  const notes = typeof offer.notes === 'string' ? offer.notes.trim() : '';
  return notes || 'Compensation shared in offer details';
}

function deliverablesFromWizard(wizard: OfferWizardState): Array<{ title: string; quantity?: number; platforms?: string[] }> {
  if (wizard.basics.dealType === 'appearance') {
    return [
      {
        title: wizard.appearance.eventOrSeriesName?.trim() || wizard.basics.offerName?.trim() || 'Appearance',
        quantity: 1,
      },
    ];
  }

  return [
    {
      title: wizard.basics.offerName?.trim() || 'Content deliverables',
      quantity: Math.max(1, Math.floor(Number(wizard.ugc.assetCount) || 1)),
      platforms: Array.isArray(wizard.ugc.primaryPlatforms) ? wizard.ugc.primaryPlatforms : [],
    },
  ];
}

function buildAthleteView(offer: StoredOffer, campaignName: string | null) {
  const structuredDraft = normalizeStructuredDraft(offer.structuredDraft);
  const wizard = structuredDraft?.wizard ?? null;
  const basics = wizard?.basics;
  const fullDescription = [offer.notes, basics?.details].filter(Boolean).join('\n\n').trim();

  return {
    title: basics?.offerName?.trim() || campaignName || 'Partnership Offer',
    shortDescription: shortDescription(offer as unknown as Record<string, unknown>),
    fullDescription,
    campaignName,
    campaignContext: '',
    timeline: { deadline: basics?.dueDate?.trim() || null },
    expectations: {
      brandApprovalRequired: wizard?.contentControl.brandApprovalRequired,
      revisionRounds: wizard?.contentControl.revisionRounds ?? null,
    },
    deliverables: wizard ? deliverablesFromWizard(wizard) : [],
    compensation: {
      summary: compensationSummary(offer as unknown as Record<string, unknown>),
      amount: basics?.amount?.trim() || null,
    },
    contractPreview: null,
    createdAt: offer.createdAt,
  };
}

async function buildReadOnlyContext(offer: StoredOffer) {
  const ctx: {
    campaignName?: string;
    campaignBrief?: string;
    athleteUserId?: string;
    athleteSnapshot?: { name?: string; sport?: string; school?: string };
    chatThreadId?: string | null;
  } = {
    athleteUserId: offer.athleteUserId,
    chatThreadId: null,
  };

  if (offer.campaignId) {
    const c = await getCampaignById(offer.campaignId);
    if (c) {
      ctx.campaignName = c.name;
      ctx.campaignBrief = typeof c.brief === 'string' ? c.brief : '';
    }
  }

  if (offer.applicationId) {
    const app = await getApplicationById(offer.applicationId);
    const snap = app?.athleteSnapshot;
    if (snap && typeof snap === 'object') {
      ctx.athleteSnapshot = {
        name: typeof snap.name === 'string' ? snap.name : undefined,
        sport: typeof snap.sport === 'string' ? snap.sport : undefined,
        school: typeof snap.school === 'string' ? snap.school : undefined,
      };
    }
  }

  return ctx;
}

async function resolveBrandName(brandUserId: string): Promise<string> {
  const supabase = await createClient();
  const { data: brandData } = await supabase
    .from('brand_profiles')
    .select('company_name')
    .eq('brand_id', brandUserId)
    .maybeSingle();
  const fromBrandProfile = typeof brandData?.company_name === 'string' ? brandData.company_name.trim() : '';
  if (fromBrandProfile) return fromBrandProfile;

  const { data } = await supabase.from('profiles').select('full_name').eq('id', brandUserId).maybeSingle();
  const fromProfile = typeof data?.full_name === 'string' ? data.full_name.trim() : '';
  if (fromProfile) return fromProfile;
  const localUser = await findUserById(brandUserId);
  return (localUser?.name ?? '').trim() || 'Brand';
}

/** Brand: draft + sent; Athlete: non-draft only (matches repository guards). */
export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');

  const { offerId } = await context.params;
  if (!offerId) return jsonError(400, 'Missing offerId');

  try {
    if (user.role === 'brand') {
      const offer = await getOfferByIdForBrand(offerId, user.userId);
      if (!offer) return jsonError(404, 'Offer not found');
      const readOnlyContext = await buildReadOnlyContext(offer);
      return NextResponse.json({
        offer: offerToJSON(offer),
        readOnlyContext,
      });
    }

    if (user.role === 'athlete') {
      const offer = await getOfferByIdForAthlete(offerId, user.userId);
      if (!offer) return jsonError(404, 'Offer not found');
      const readOnlyContext = await buildReadOnlyContext(offer);
      const row = offer as unknown as Record<string, unknown>;
      const now = Date.now();
      const brandName = await resolveBrandName(offer.brandUserId);
      let campaignName: string | null = null;
      if (offer.campaignId) {
        const c = await getCampaignById(offer.campaignId);
        campaignName = c?.name ?? null;
      }
      const athleteView = buildAthleteView(offer, campaignName);
      athleteView.campaignContext = readOnlyContext.campaignBrief ?? '';
      return NextResponse.json({
        offer: {
          ...offerToJSON(offer),
          athleteOfferStatus: computeAthleteStatus(row, now),
          brandName,
          campaignName,
          shortDescription: shortDescription(row),
          compensationSummary: compensationSummary(row),
          deadline: extractDeadline(row),
        },
        athleteView,
        readOnlyContext,
      });
    }

    return jsonError(403, 'Forbidden');
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load offer';
    return jsonError(500, msg);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');
  if (user.role !== 'brand') return jsonError(403, 'Forbidden');

  const { offerId } = await context.params;
  if (!offerId) return jsonError(400, 'Missing offerId');

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const patch: { structuredDraft?: Record<string, unknown>; notes?: string } = {};
  if (body.structuredDraft !== undefined) {
    if (body.structuredDraft !== null && typeof body.structuredDraft !== 'object') {
      return jsonError(400, 'structuredDraft must be an object');
    }
    patch.structuredDraft = body.structuredDraft as Record<string, unknown>;
  }
  if (typeof body.notes === 'string') {
    patch.notes = body.notes;
  }

  try {
    const updated = await updateOfferDraftFields(offerId, user.userId, patch);
    if (!updated) return jsonError(404, 'Not found or not editable');
    return NextResponse.json({ offer: offerToJSON(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed';
    return jsonError(400, msg);
  }
}
