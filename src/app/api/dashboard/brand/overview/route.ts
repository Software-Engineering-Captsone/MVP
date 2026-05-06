import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/jsonError';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import {
  listApplicationsForCampaign,
  listCampaignsForBrand,
} from '@/lib/campaigns/repository';
import { applicationToJSON, campaignToJSON } from '@/lib/campaigns/serialization';
import { listDealsForCurrentUser } from '@/lib/campaigns/deals/supabaseRepository';

/**
 * Brand dashboard overview aggregate.
 *
 * Keeps the business dashboard from doing N+1 route calls for campaigns,
 * applications, and deals. Authorization stays anchored to getAuthUser()
 * and repository reads remain RLS-scoped to the signed-in brand.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');
  if (user.role !== 'brand') return jsonError(403, 'Forbidden');

  try {
    const campaigns = await listCampaignsForBrand(user.userId);
    const [applicationsByCampaign, deals] = await Promise.all([
      Promise.all(campaigns.map((campaign) => listApplicationsForCampaign(String(campaign._id)))),
      listDealsForCurrentUser(),
    ]);

    return NextResponse.json({
      campaigns: campaigns.map(campaignToJSON),
      applications: applicationsByCampaign.flat().map(applicationToJSON),
      deals,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load brand overview';
    return jsonError(500, msg);
  }
}

export const dynamic = 'force-dynamic';
