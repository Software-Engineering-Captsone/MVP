import { NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import {
  getCampaignById,
  listApplicationsForAthlete,
} from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { findUserById } from '@/lib/auth/localUserRepository';

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
      const brandUser = brandId ? await findUserById(brandId) : null;
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
                (brandUser && typeof brandUser.name === 'string' && brandUser.name.trim()) ||
                'Brand',
            }
          : null,
      };
    })
  );

  return NextResponse.json({ applications: mapped });
}
