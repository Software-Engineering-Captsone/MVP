import { NextResponse } from 'next/server';
import { buildSeedSystemCampaignTemplates } from '@/lib/campaigns/seedCampaignTemplates';

/**
 * GET /api/campaign-templates?scope=all
 *
 * Returns the curated system templates that the wizard offers as starting
 * points. Per-org templates are not yet persisted — when the
 * `campaign_templates` table lands, merge those rows in here keyed by
 * the requesting brand's org/user.
 */
export async function GET() {
  const seeds = buildSeedSystemCampaignTemplates();
  const templates = seeds.map((t) => ({
    id: t._id,
    name: t.name,
    description: t.description,
    version: t.version,
    orgId: t.orgId ?? undefined,
    defaults: t.defaults,
  }));
  return NextResponse.json({ templates });
}

export const dynamic = 'force-dynamic';
