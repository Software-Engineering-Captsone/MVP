import { NextResponse } from 'next/server';
import { buildSeedSystemCampaignTemplates } from '@/lib/campaigns/seedCampaignTemplates';
import { listCampaignTemplatesForBrand } from '@/lib/campaigns/repository';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';

/**
 * GET /api/campaign-templates?scope=all
 *
 * Returns curated system templates merged with per-brand saved templates
 * for the authenticated brand (when present). System templates are
 * versioned with the codebase; per-brand rows live in
 * public.campaign_templates and are appended after the seeds so the
 * wizard shows curated picks first.
 */
export async function GET() {
  const seeds = buildSeedSystemCampaignTemplates();
  const systemTemplates = seeds.map((t) => ({
    id: t._id,
    name: t.name,
    description: t.description,
    version: t.version,
    orgId: t.orgId ?? undefined,
    defaults: t.defaults,
  }));

  let brandTemplates: Array<{
    id: string;
    name: string;
    description: string;
    version: number;
    orgId: string | undefined;
    defaults: Record<string, unknown>;
  }> = [];
  try {
    const user = await getAuthUser();
    if (user?.role === 'brand') {
      const rows = await listCampaignTemplatesForBrand(user.userId);
      brandTemplates = rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        version: r.version,
        orgId: undefined,
        defaults: r.defaults,
      }));
    }
  } catch {
    // Table may not exist yet in environments where the migration hasn't
    // run. Fall back to seeds only rather than failing the wizard.
    brandTemplates = [];
  }

  return NextResponse.json({ templates: [...systemTemplates, ...brandTemplates] });
}

export const dynamic = 'force-dynamic';
