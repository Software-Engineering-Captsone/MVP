import { NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import {
  getCampaignById,
  isPastCampaignApplicationDeadline,
  listApplicationsForAthlete,
} from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { getThreadByApplicationId } from '@/lib/chat/service';
import {
  athleteMaySendOnApplication,
  athleteMayViewApplicationThread,
} from '@/lib/chat/messagingEligibility';

export async function GET() {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'athlete') return jsonError(403, 'Forbidden');

  const rows = await listApplicationsForAthlete(session.id);

  const mapped = await Promise.all(
    rows.map(async (app) => {
      const campaign = await getCampaignById(String(app.campaignId ?? ''));
      const brandId = campaign?.brandUserId != null ? String(campaign.brandUserId) : '';

      let canSend = false;
      let canViewThread = false;
      try {
        const offers: Parameters<typeof athleteMaySendOnApplication>[1] = [];
        const existingThread = await getThreadByApplicationId(supabase, String(app._id ?? ''));
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

      return {
        application: applicationToJSON(app),
        campaign: campaign
          ? {
              id: String(campaign._id ?? ''),
              name: String(campaign.name ?? 'Campaign'),
              image: typeof campaign.image === 'string' ? campaign.image : '',
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
