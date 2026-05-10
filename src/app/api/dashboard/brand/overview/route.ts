import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/jsonError';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import {
  listApplicationsForCampaigns,
  listCampaignsForBrand,
} from '@/lib/campaigns/repository';
import { campaignToJSON } from '@/lib/campaigns/serialization';
import { listDealsForCurrentUser } from '@/lib/campaigns/deals/supabaseRepository';
import { enrichApplicationsForBrandCampaigns } from '@/lib/campaigns/applicationEnrichment';

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
    const [applications, deals] = await Promise.all([
      listApplicationsForCampaigns(campaigns.map((campaign) => String(campaign._id))),
      listDealsForCurrentUser(),
    ]);
    const enrichedApplications = await enrichApplicationsForBrandCampaigns(applications);

    return NextResponse.json({
      campaigns: campaigns.map(campaignToJSON),
      applications: enrichedApplications,
      deals,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load brand overview';
    return jsonError(500, msg);
  }
}

export const dynamic = 'force-dynamic';
