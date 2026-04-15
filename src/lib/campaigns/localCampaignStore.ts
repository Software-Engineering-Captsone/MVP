import fs from 'fs/promises';
import path from 'path';
import type {
  StoredDeal,
  StoredDealActivity,
  StoredDealContract,
  StoredDealPayment,
  StoredDeliverable,
  StoredSubmission,
} from './deals/types';

/**
 * Local file persistence for campaigns and applications (no cloud DB).
 * Swap this module for Supabase (or another DB) while keeping the same repository API.
 */
export const LOCAL_CAMPAIGN_STORE_PATH = path.join(process.cwd(), 'data', 'local-campaign-store.json');

export type StoredCampaign = Record<string, unknown> & { _id: string };
export type StoredApplication = Record<string, unknown> & { _id: string };
export type StoredOffer = Record<string, unknown> & { _id: string };

export type {
  StoredDeal,
  StoredDeliverable,
  StoredSubmission,
  StoredDealContract,
  StoredDealPayment,
  StoredDealActivity,
};

/** Campaign brief template row (system: `orgId` null; org: `orgId` = brand account id in local MVP). */
export type StoredCampaignTemplate = Record<string, unknown> & {
  _id: string;
  orgId: string | null;
  name: string;
  description?: string;
  version: number;
  status: 'active' | 'archived';
  defaults: Record<string, unknown>;
  lockedPaths?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export interface LocalCampaignStoreSnapshot {
  campaigns: StoredCampaign[];
  applications: StoredApplication[];
  offers: StoredOffer[];
  campaignTemplates: StoredCampaignTemplate[];
  deals: StoredDeal[];
  deliverables: StoredDeliverable[];
  submissions: StoredSubmission[];
  dealContracts: StoredDealContract[];
  dealPayments: StoredDealPayment[];
  dealActivities: StoredDealActivity[];
}

const EMPTY: LocalCampaignStoreSnapshot = {
  campaigns: [],
  applications: [],
  offers: [],
  campaignTemplates: [],
  deals: [],
  deliverables: [],
  submissions: [],
  dealContracts: [],
  dealPayments: [],
  dealActivities: [],
};

let writeChain: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function readLocalCampaignStore(): Promise<LocalCampaignStoreSnapshot> {
  try {
    const raw = await fs.readFile(LOCAL_CAMPAIGN_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
    const o = parsed as Record<string, unknown>;
    const campaigns = Array.isArray(o.campaigns) ? o.campaigns : [];
    const applications = Array.isArray(o.applications) ? o.applications : [];
    const offers = Array.isArray(o.offers) ? o.offers : [];
    const campaignTemplates = Array.isArray(o.campaignTemplates) ? o.campaignTemplates : [];
    const deals = Array.isArray(o.deals) ? o.deals : [];
    const deliverables = Array.isArray(o.deliverables) ? o.deliverables : [];
    const submissions = Array.isArray(o.submissions) ? o.submissions : [];
    const dealContracts = Array.isArray(o.dealContracts) ? o.dealContracts : [];
    const dealPayments = Array.isArray(o.dealPayments) ? o.dealPayments : [];
    const dealActivities = Array.isArray(o.dealActivities) ? o.dealActivities : [];
    return {
      campaigns: campaigns as StoredCampaign[],
      applications: applications as StoredApplication[],
      offers: offers as StoredOffer[],
      campaignTemplates: campaignTemplates as StoredCampaignTemplate[],
      deals: deals as StoredDeal[],
      deliverables: deliverables as StoredDeliverable[],
      submissions: submissions as StoredSubmission[],
      dealContracts: dealContracts as StoredDealContract[],
      dealPayments: dealPayments as StoredDealPayment[],
      dealActivities: dealActivities as StoredDealActivity[],
    };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'ENOENT') return { ...EMPTY };
    throw e;
  }
}

export async function writeLocalCampaignStore(snapshot: LocalCampaignStoreSnapshot): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_CAMPAIGN_STORE_PATH), { recursive: true });
  await fs.writeFile(
    LOCAL_CAMPAIGN_STORE_PATH,
    JSON.stringify(snapshot, null, 2),
    'utf8'
  );
}

export async function mutateLocalCampaignStore(
  mutator: (draft: LocalCampaignStoreSnapshot) => void | Promise<void>
): Promise<LocalCampaignStoreSnapshot> {
  return withLock(async () => {
    const draft = await readLocalCampaignStore();
    await mutator(draft);
    await writeLocalCampaignStore(draft);
    return draft;
  });
}
