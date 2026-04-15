import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { finalizeOfferAcceptanceAndOpenDeal } from '@/lib/campaigns/deals/repository';
import { dealToJSON, offerToJSON } from '@/lib/campaigns/serialization';
import { insertMessage } from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'athlete') return jsonError(403, 'Forbidden');

  const { id: offerId } = await context.params;
  const result = await finalizeOfferAcceptanceAndOpenDeal(offerId, {
    mode: 'athlete',
    athleteUserId: session.id,
  });
  if (!result.ok) {
    return jsonError(result.status, result.error, result.details);
  }
  const snapshot = await readLocalCampaignStore();
  const offer = snapshot.offers.find((o) => String(o._id) === offerId);
  if (result.deal.chatThreadId) {
    try {
      await insertMessage(
        supabase,
        result.deal.chatThreadId,
        session.id,
        'Offer accepted. This conversation has moved into active deal execution.',
        { messageKind: 'system', offerId }
      );
    } catch (e) {
      console.error('Failed to post offer accepted message', e);
    }
  }
  return NextResponse.json({
    deal: dealToJSON(result.deal),
    ...(offer ? { offer: offerToJSON(offer, snapshot.campaigns) } : {}),
  });
}
