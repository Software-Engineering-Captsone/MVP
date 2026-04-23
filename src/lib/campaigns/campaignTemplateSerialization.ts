import { normalizeCampaignBriefV2 } from './campaignBriefV2Mapper';
import type { StoredCampaignTemplate } from './localCampaignStore';

function idOf(row: { _id?: unknown }): string {
  return row._id != null ? String(row._id) : '';
}

export function campaignTemplateToJSON(t: StoredCampaignTemplate) {
  const orgId = t.orgId;
  return {
    id: idOf(t),
    ...(orgId != null && orgId !== '' ? { orgId: String(orgId) } : {}),
    name: String(t.name ?? ''),
    description: typeof t.description === 'string' && t.description.trim() ? t.description : undefined,
    version: typeof t.version === 'number' ? t.version : Number(t.version) || 1,
    status: t.status === 'archived' ? 'archived' : 'active',
    defaults: normalizeCampaignBriefV2(t.defaults),
    lockedPaths: Array.isArray(t.lockedPaths)
      ? (t.lockedPaths as unknown[]).map((p) => String(p))
      : undefined,
    createdBy: String(t.createdBy ?? ''),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
