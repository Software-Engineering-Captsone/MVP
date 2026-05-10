import type { StoredApplication, StoredCampaign, StoredOffer } from './repository';
import { normalizeApplicationStatus, normalizeCampaignStatus } from './status';

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
    campaignBriefV2: c.campaignBriefV2 ?? null,
    status: normalizeCampaignStatus(c.status),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function applicationToJSON(a: StoredApplication) {
  const status = normalizeApplicationStatus(a.status);
  const statusHistory = [
    { status: 'pending', at: a.createdAt },
    ...(status !== 'pending' ? [{ status, at: a.updatedAt }] : []),
  ].filter((entry) => entry.at);
  const previousPitch =
    typeof a.previousPitch === 'string' && a.previousPitch.trim().length > 0
      ? a.previousPitch
      : '';

  return {
    id: idOf(a),
    campaignId: a.campaignId,
    athleteUserId: a.athleteUserId,
    status,
    pitch: a.pitch ?? '',
    withdrawnByAthlete: status === 'withdrawn',
    statusHistory,
    hasPreviousPitch: previousPitch.length > 0,
    athleteSnapshot: a.athleteSnapshot ?? {},
    messages: (Array.isArray(a.messages) ? a.messages : []).map((m) => ({
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

/** API shape for an offer. Optional timeline stamps are omitted when null
 *  so the response stays compact for offers that haven't reached that
 *  state yet. */
export function offerToJSON(o: StoredOffer) {
  return {
    id: idOf(o),
    brandUserId: o.brandUserId,
    athleteUserId: o.athleteUserId,
    campaignId: o.campaignId,
    applicationId: o.applicationId,
    ...(o.dealId ? { dealId: o.dealId } : {}),
    offerOrigin: o.offerOrigin,
    status: o.status,
    structuredDraft: o.structuredDraft,
    notes: o.notes ?? '',
    ...(o.declineReason ? { declineReason: o.declineReason } : {}),
    ...(o.declineNote ? { declineNote: o.declineNote } : {}),
    ...(o.sentAt ? { sentAt: o.sentAt } : {}),
    ...(o.acceptedAt ? { acceptedAt: o.acceptedAt } : {}),
    ...(o.declinedAt ? { declinedAt: o.declinedAt } : {}),
    ...(o.withdrawnAt ? { withdrawnAt: o.withdrawnAt } : {}),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}
