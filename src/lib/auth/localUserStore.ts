import fs from 'fs/promises';
import path from 'path';

/**
 * Server-only JSON persistence for users (no MongoDB).
 * Aligns with fields in `src/models/User.ts` for a future DB swap.
 */
export const LOCAL_USERS_STORE_PATH = path.join(process.cwd(), 'data', 'local-users-store.json');

export interface StoredUser {
  _id: string;
  email: string;
  password: string | null;
  role: 'athlete' | 'brand';
  name: string;
  googleId?: string;
  verified: boolean;
  verificationToken?: string;
  verificationExpires?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: string;
  createdAt: string;
}

export interface LocalUsersSnapshot {
  users: StoredUser[];
}

const EMPTY: LocalUsersSnapshot = { users: [] };

let writeChain: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function readLocalUsersStore(): Promise<LocalUsersSnapshot> {
  try {
    const raw = await fs.readFile(LOCAL_USERS_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
    const o = parsed as Record<string, unknown>;
    const users = Array.isArray(o.users) ? o.users : [];
    return { users: users as StoredUser[] };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'ENOENT') return { ...EMPTY };
    throw e;
  }
}

export async function writeLocalUsersStore(snapshot: LocalUsersSnapshot): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_USERS_STORE_PATH), { recursive: true });
  await fs.writeFile(LOCAL_USERS_STORE_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
}

export async function mutateLocalUsersStore(
  mutator: (draft: LocalUsersSnapshot) => void | Promise<void>
): Promise<LocalUsersSnapshot> {
  return withLock(async () => {
    const draft = await readLocalUsersStore();
    await mutator(draft);
    await writeLocalUsersStore(draft);
    return draft;
  });
}
