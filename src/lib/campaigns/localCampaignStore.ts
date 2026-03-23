import fs from 'fs/promises';
import path from 'path';

/**
 * Local file persistence for campaigns and applications (no cloud DB).
 * Swap this module for MongoDB writes while keeping the same repository API.
 */
export const LOCAL_CAMPAIGN_STORE_PATH = path.join(process.cwd(), 'data', 'local-campaign-store.json');

export type StoredCampaign = Record<string, unknown> & { _id: string };
export type StoredApplication = Record<string, unknown> & { _id: string };

export interface LocalCampaignStoreSnapshot {
  campaigns: StoredCampaign[];
  applications: StoredApplication[];
}

const EMPTY: LocalCampaignStoreSnapshot = { campaigns: [], applications: [] };

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
    return {
      campaigns: campaigns as StoredCampaign[],
      applications: applications as StoredApplication[],
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
