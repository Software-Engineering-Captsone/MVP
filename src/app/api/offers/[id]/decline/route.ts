import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { declineOfferByAthlete } from '@/lib/campaigns/deals/repository';
import { offerToJSON } from '@/lib/campaigns/serialization';

type RouteContext = { params: Promise<{ id: string }> };

const DECLINE_REASONS = new Set([
  'not_interested',
  'timing_conflict',
  'compensation_too_low',
  'does_not_fit_brand',
  'other',
]);

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'athlete') return jsonError(403, 'Forbidden');

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      body = raw as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const declineReasonRaw = typeof body.declineReason === 'string' ? body.declineReason.trim() : '';
  const declineReason = DECLINE_REASONS.has(declineReasonRaw) ? declineReasonRaw : '';
  const declineNote = typeof body.declineNote === 'string' ? body.declineNote.trim() : '';

  const { id: offerId } = await context.params;
  const result = await declineOfferByAthlete(
    offerId,
    session.id,
    declineReason || undefined,
    declineNote || undefined
  );
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  const snapshot = await readLocalCampaignStore();
  const offer = snapshot.offers.find((o) => String(o._id) === offerId);
  if (!offer) return jsonError(404, 'Offer not found');
  return NextResponse.json({ offer: offerToJSON(offer, snapshot.campaigns) });
}
