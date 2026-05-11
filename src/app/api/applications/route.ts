import { NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import {
  isPastCampaignApplicationDeadline,
  listCampaignsByIds,
  listApplicationsForAthlete,
  listOffersForAthlete,
  pickOfferForApplication,
} from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { listThreadsByApplicationIds } from '@/lib/chat/service';
import {
  athleteMaySendOnApplication,
  athleteMayViewApplicationThread,
} from '@/lib/chat/messagingEligibility';

/** Prefer campaign hero image; if unset (common), use the brand account avatar — same source as marketplace brand logos. */
function resolveCampaignListImage(
  campaignImage: string | undefined,
  brandId: string,
  avatarByBrandId: Map<string, string>,
): string {
  const fromCampaign = typeof campaignImage === 'string' ? campaignImage.trim() : '';
  if (fromCampaign) return fromCampaign;
  const fromProfile = brandId ? avatarByBrandId.get(brandId) : '';
  return typeof fromProfile === 'string' ? fromProfile.trim() : '';
}

export async function GET() {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'athlete') return jsonError(403, 'Forbidden');

  const rows = await listApplicationsForAthlete(session.id);
  const campaigns = await listCampaignsByIds(rows.map((app) => String(app.campaignId ?? '')));
  const campaignById = new Map(campaigns.map((campaign) => [String(campaign._id ?? ''), campaign]));

  const brandIds = [
    ...new Set(
      campaigns
        .map((c) => (c.brandUserId != null ? String(c.brandUserId) : ''))
        .filter((id) => id.length > 0),
    ),
  ];
  const avatarByBrandId = new Map<string, string>();
  if (brandIds.length > 0) {
    const { data: profileRows } = await supabase.from('profiles').select('id, avatar_url').in('id', brandIds);
    for (const row of profileRows ?? []) {
      const r = row as { id: string; avatar_url: string | null };
      const url = typeof r.avatar_url === 'string' ? r.avatar_url.trim() : '';
      if (url) avatarByBrandId.set(String(r.id), url);
    }
  }

  const offers = await listOffersForAthlete(session.id);
  const { data: athleteDeals } = await supabase.from('deals').select('id, status').eq('athlete_id', session.id);
  const dealStatusById = new Map<string, string>(
    (athleteDeals ?? []).map((d: { id: string; status: string }) => [d.id, d.status]),
  );
  const threads = await listThreadsByApplicationIds(supabase, rows.map((app) => String(app._id ?? '')));
  const threadByApplicationId = new Map(
    threads
      .filter((thread) => thread.application_id)
      .map((thread) => [String(thread.application_id), thread]),
  );

  const mapped = await Promise.all(
    rows.map(async (app) => {
      const campaign = campaignById.get(String(app.campaignId ?? '')) ?? null;
      const brandId = campaign?.brandUserId != null ? String(campaign.brandUserId) : '';

      let canSend = false;
      let canViewThread = false;
      try {
        const existingThread = threadByApplicationId.get(String(app._id ?? '')) ?? null;
        canSend = athleteMaySendOnApplication(app, offers);
        canViewThread = brandId
          ? await athleteMayViewApplicationThread(
              supabase,
              app,
              brandId,
              offers,
              existingThread?.id ?? null,
            )
          : false;
      } catch (e) {
        console.error('Failed to resolve application messaging availability', e);
      }

      const linkedOffer = pickOfferForApplication(offers, String(app._id ?? ''));
      const dealId =
        linkedOffer?.dealId != null && String(linkedOffer.dealId).trim() !== ''
          ? String(linkedOffer.dealId)
          : null;
      const dealStatus = dealId ? dealStatusById.get(dealId) ?? null : null;

      return {
        application: applicationToJSON(app),
        handoff: linkedOffer
          ? {
              offerId: String(linkedOffer._id ?? ''),
              dealId,
              dealStatus,
              offerStatus: linkedOffer.status,
            }
          : null,
        campaign: campaign
          ? {
              id: String(campaign._id ?? ''),
              name: String(campaign.name ?? 'Campaign'),
              image: resolveCampaignListImage(campaign.image, brandId, avatarByBrandId),
              brandUserId: brandId,
              brandDisplayName:
                (typeof campaign.brandDisplayName === 'string' && campaign.brandDisplayName.trim()) ||
                'Brand',
              applicationDeadlinePassed: isPastCampaignApplicationDeadline(campaign),
            }
          : null,
        applicationMessaging: {
          canViewThread,
          canSend,
        },
      };
    }),
  );

  return NextResponse.json({ applications: mapped });
}
