import type { StoredApplication, StoredCampaign } from './localCampaignStore';

function idOf(row: { _id?: unknown }): string {
  return row._id != null ? String(row._id) : '';
}

/** API shape for list + detail (shared fields). */
export function campaignToJSON(c: StoredCampaign) {
  return {
    id: idOf(c),
    brandUserId: c.brandUserId,
    brandDisplayName: c.brandDisplayName ?? '',
    name: c.name,
    subtitle: c.subtitle ?? '',
    packageName: c.packageName ?? '',
    packageId: c.packageId ?? '',
    goal: c.goal ?? '',
    brief: c.brief ?? '',
    budget: c.budget ?? '',
    duration: c.duration ?? '',
    location: c.location ?? '',
    startDate: c.startDate ?? '',
    endDate: c.endDate ?? '',
    visibility: c.visibility,
    acceptApplications: c.acceptApplications,
    sport: c.sport ?? '',
    genderFilter: c.genderFilter ?? '',
    followerMin: c.followerMin ?? 0,
    packageDetails: c.packageDetails ?? [],
    platforms: c.platforms ?? [],
    image: c.image ?? '',
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function applicationToJSON(a: StoredApplication) {
  return {
    id: idOf(a),
    campaignId: a.campaignId,
    athleteUserId: a.athleteUserId,
    status: a.status,
    pitch: a.pitch ?? '',
    athleteSnapshot: a.athleteSnapshot ?? {},
    messages: (Array.isArray(a.messages) ? a.messages : []).map((m: Record<string, unknown>) => ({
      id: m._id != null ? String(m._id) : '',
      fromUserId: m.fromUserId,
      body: m.body,
      createdAt: m.createdAt,
    })),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function athletePublicCampaignJSON(c: StoredCampaign) {
  const full = campaignToJSON(c);
  const { brandUserId: _brandUserId, ...rest } = full;
  void _brandUserId;
  return rest;
}
