import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { sendOfferToAthlete } from '@/lib/campaigns/deals/repository';
import { offerToJSON } from '@/lib/campaigns/serialization';
import { getApplicationById, getCampaignById } from '@/lib/campaigns/repository';
import {
  ensureApplicationCampaignThread,
  ensureBrandOutreachThread,
  insertMessage,
} from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'brand') return jsonError(403, 'Forbidden');

  const { id: offerId } = await context.params;
  const result = await sendOfferToAthlete(offerId, session.id);
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  const snapshot = await readLocalCampaignStore();
  const offer = snapshot.offers.find((o) => String(o._id) === offerId);
  if (!offer) return jsonError(404, 'Offer not found');

  try {
    const appId = offer.applicationId != null && String(offer.applicationId).trim()
      ? String(offer.applicationId)
      : '';
    if (appId) {
      const app = await getApplicationById(appId);
      const campaign = app ? await getCampaignById(String(app.campaignId ?? '')) : null;
      if (app && campaign) {
        const thread = await ensureApplicationCampaignThread(supabase, appId, app, campaign);
        await insertMessage(
          supabase,
          thread.id,
          session.id,
          'You received a new offer. Review it in Pending Offers.',
          { messageKind: 'offer', offerId }
        );
      }
    } else {
      const thread = await ensureBrandOutreachThread(supabase, {
        brandUserId: session.id,
        athleteUserId: String(offer.athleteUserId ?? ''),
        campaignId:
          offer.campaignId != null && String(offer.campaignId).trim()
            ? String(offer.campaignId)
            : null,
      });
      await insertMessage(
        supabase,
        thread.id,
        session.id,
        'You received a new offer. Review it in Pending Offers.',
        { messageKind: 'offer', offerId }
      );
    }
  } catch (e) {
    console.error('Failed to post offer notification message', e);
  }

  return NextResponse.json({ offer: offerToJSON(offer, snapshot.campaigns) });
}
