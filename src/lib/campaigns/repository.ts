import mongoose from 'mongoose';
import {
  mutateLocalCampaignStore,
  readLocalCampaignStore,
  type StoredApplication,
  type StoredCampaign,
} from './localCampaignStore';
import { buildSeedCampaignTemplates, SEED_CAMPAIGN_IDS } from './seedCampaigns';
import { validateApplicationInput, validateCampaignInput } from './validateWithMongoose';

const OPEN_STATUSES = ['Open for Applications', 'Reviewing Candidates'] as const;

function idStr(doc: { _id?: unknown }): string {
  if (doc._id == null) return '';
  return String(doc._id);
}

/** Merge demo campaigns once per process when any seed id is missing (cheap read first). */
async function ensureSeedCampaignsPresent(): Promise<void> {
  const snap = await readLocalCampaignStore();
  const idSet = new Set(snap.campaigns.map((c) => idStr(c)));
  if (SEED_CAMPAIGN_IDS.every((id) => idSet.has(id))) return;

  await mutateLocalCampaignStore((draft) => {
    const ids = new Set(draft.campaigns.map((c) => idStr(c)));
    for (const template of buildSeedCampaignTemplates()) {
      const id = String(template._id ?? '');
      if (!id || ids.has(id)) continue;
      try {
        const raw = validateCampaignInput(template as Record<string, unknown>);
        const row = { ...raw, _id: idStr(raw) || id } as StoredCampaign;
        draft.campaigns.push(row);
        ids.add(row._id);
      } catch (e) {
        console.error('[campaigns] Seed campaign skipped:', id, e);
      }
    }
  });
}

export async function listCampaignsForBrand(brandUserId: string): Promise<StoredCampaign[]> {
  const { campaigns } = await readLocalCampaignStore();
  return campaigns.filter((c) => c.brandUserId === brandUserId);
}

export async function listOpenCampaignsForAthlete(): Promise<StoredCampaign[]> {
  await ensureSeedCampaignsPresent();
  const { campaigns } = await readLocalCampaignStore();
  const open = campaigns.filter(
    (c) =>
      c.visibility === 'Public' &&
      c.acceptApplications === true &&
      OPEN_STATUSES.includes(c.status as (typeof OPEN_STATUSES)[number])
  );
  return open.sort((a, b) => {
    const ta = new Date(String(a.createdAt ?? 0)).getTime();
    const tb = new Date(String(b.createdAt ?? 0)).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
}

export async function getCampaignById(campaignId: string): Promise<StoredCampaign | null> {
  const { campaigns } = await readLocalCampaignStore();
  return campaigns.find((c) => idStr(c) === campaignId) ?? null;
}

export async function createCampaign(
  input: Record<string, unknown>
): Promise<StoredCampaign> {
  const _id = new mongoose.Types.ObjectId().toString();
  const raw = validateCampaignInput({ ...input, _id });
  const row = { ...raw, _id: idStr(raw) || _id } as StoredCampaign;

  await mutateLocalCampaignStore((draft) => {
    draft.campaigns.push(row);
  });
  return row;
}

export async function updateCampaign(
  campaignId: string,
  brandUserId: string,
  patch: Partial<Pick<StoredCampaign, 'status' | 'acceptApplications'>>
): Promise<StoredCampaign | null> {
  let updated: StoredCampaign | null = null;
  await mutateLocalCampaignStore((draft) => {
    const idx = draft.campaigns.findIndex((c) => idStr(c) === campaignId);
    if (idx === -1) return;
    const c = draft.campaigns[idx];
    if (c.brandUserId !== brandUserId) return;
    const next = { ...c, ...patch };
    validateCampaignInput(next as Record<string, unknown>);
    draft.campaigns[idx] = next as StoredCampaign;
    updated = draft.campaigns[idx];
  });
  return updated;
}

export async function listApplicationsForCampaign(campaignId: string): Promise<StoredApplication[]> {
  const { applications } = await readLocalCampaignStore();
  return applications.filter((a) => a.campaignId === campaignId);
}

export async function getApplicationById(applicationId: string): Promise<StoredApplication | null> {
  const { applications } = await readLocalCampaignStore();
  return applications.find((a) => idStr(a) === applicationId) ?? null;
}

export async function createApplication(
  input: Record<string, unknown>
): Promise<{ application: StoredApplication; error?: 'duplicate' }> {
  const campaignId = String(input.campaignId ?? '');
  const athleteUserId = String(input.athleteUserId ?? '');
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }
  if (campaign.visibility !== 'Public' || !campaign.acceptApplications) {
    throw new Error('Campaign is not accepting applications');
  }
  if (!OPEN_STATUSES.includes(campaign.status as (typeof OPEN_STATUSES)[number])) {
    throw new Error('Campaign is not open for applications');
  }

  const existing = await readLocalCampaignStore();
  if (
    existing.applications.some(
      (a) => a.campaignId === campaignId && a.athleteUserId === athleteUserId
    )
  ) {
    return {
      error: 'duplicate',
      application: existing.applications.find(
        (a) => a.campaignId === campaignId && a.athleteUserId === athleteUserId
      )!,
    };
  }

  const _id = new mongoose.Types.ObjectId().toString();
  const raw = validateApplicationInput({
    ...input,
    _id,
    status: input.status ?? 'pending',
    messages: input.messages ?? [],
  });
  const row = { ...raw, _id: idStr(raw) || _id } as StoredApplication;

  await mutateLocalCampaignStore((draft) => {
    draft.applications.push(row);
    if (campaign.status === 'Open for Applications') {
      const idx = draft.campaigns.findIndex((c) => idStr(c) === campaignId);
      if (idx >= 0) {
        draft.campaigns[idx] = {
          ...draft.campaigns[idx],
          status: 'Reviewing Candidates',
        } as StoredCampaign;
      }
    }
  });

  return { application: row };
}

export async function updateApplicationStatus(
  applicationId: string,
  brandUserId: string,
  status: 'pending' | 'shortlisted' | 'approved' | 'declined'
): Promise<StoredApplication | null> {
  let updated: StoredApplication | null = null;
  await mutateLocalCampaignStore((draft) => {
    const aidx = draft.applications.findIndex((a) => idStr(a) === applicationId);
    if (aidx === -1) return;
    const app = draft.applications[aidx];
    const camp = draft.campaigns.find((c) => idStr(c) === app.campaignId);
    if (!camp || camp.brandUserId !== brandUserId) return;
    const next = { ...app, status };
    validateApplicationInput(next as Record<string, unknown>);
    draft.applications[aidx] = next as StoredApplication;
    updated = draft.applications[aidx];
  });
  return updated;
}

export async function appendApplicationMessage(
  applicationId: string,
  userId: string,
  body: string
): Promise<{ application: StoredApplication | null; error?: 'forbidden' | 'not_found' }> {
  let result: StoredApplication | null = null;
  let error: 'forbidden' | 'not_found' | undefined;
  await mutateLocalCampaignStore((draft) => {
    const aidx = draft.applications.findIndex((a) => idStr(a) === applicationId);
    if (aidx === -1) {
      error = 'not_found';
      return;
    }
    const app = draft.applications[aidx];
    const camp = draft.campaigns.find((c) => idStr(c) === app.campaignId);
    if (!camp) {
      error = 'not_found';
      return;
    }
    const allowed = app.athleteUserId === userId || camp.brandUserId === userId;
    if (!allowed) {
      error = 'forbidden';
      return;
    }
    const messages = Array.isArray(app.messages) ? [...app.messages] : [];
    messages.push({
      _id: new mongoose.Types.ObjectId().toString(),
      fromUserId: userId,
      body: body.trim(),
      createdAt: new Date(),
    });
    const next = { ...app, messages };
    validateApplicationInput(next as Record<string, unknown>);
    draft.applications[aidx] = next as StoredApplication;
    result = draft.applications[aidx];
  });
  return { application: result, error };
}
