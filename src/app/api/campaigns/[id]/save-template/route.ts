import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createBrandCampaignTemplate,
  getCampaignById,
} from '@/lib/campaigns/repository';
import { resolveCampaignBriefV2ForApi } from '@/lib/campaigns/campaignBriefV2Mapper';
import { jsonError } from '@/lib/api/jsonError';

/**
 * POST /api/campaigns/:id/save-template
 *
 * Persists the current campaign's brief as a per-brand reusable template.
 * Body: { name: string; description?: string; lockedPaths?: string[] }
 *
 * The brand must own the source campaign. The template's `defaults`
 * snapshot is taken from the campaign's normalized CampaignBriefV2 so
 * the wizard can rehydrate it later without depending on the original
 * campaign row staying around.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError(401, 'Unauthorized');

  const campaign = await getCampaignById(id);
  if (!campaign) return jsonError(404, 'Campaign not found');
  if (campaign.brandUserId !== user.id) return jsonError(403, 'Forbidden');

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const lockedPaths = Array.isArray(body.lockedPaths)
    ? body.lockedPaths.filter((p): p is string => typeof p === 'string')
    : null;

  if (!name) return jsonError(400, 'name is required');

  const brief = resolveCampaignBriefV2ForApi(campaign as unknown as Record<string, unknown>);
  if (!brief) return jsonError(400, 'Campaign has no usable brief to template from');

  try {
    const tpl = await createBrandCampaignTemplate({
      brandUserId: user.id,
      name,
      description,
      defaults: brief as unknown as Record<string, unknown>,
      lockedPaths: lockedPaths && lockedPaths.length > 0 ? lockedPaths : null,
      sourceCampaignId: id,
    });
    return NextResponse.json({
      template: {
        id: tpl.id,
        name: tpl.name,
        description: tpl.description,
        version: tpl.version,
        orgId: undefined,
        defaults: tpl.defaults,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to save template';
    return jsonError(400, msg);
  }
}

export const dynamic = 'force-dynamic';
