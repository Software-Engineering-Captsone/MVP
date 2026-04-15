import crypto from 'crypto';
import { newObjectIdHex } from '@/lib/generateId';
import { mergeAthleteProfile, type AthleteProfile } from './athleteProfile';
import {
  mutateLocalUsersStore,
  readLocalUsersStore,
  type StoredUser,
} from './localUserStore';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const { users } = await readLocalUsersStore();
  return users.find((u) => u._id === id) ?? null;
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const e = normalizeEmail(email);
  const { users } = await readLocalUsersStore();
  return users.find((u) => normalizeEmail(u.email) === e) ?? null;
}

export async function findUserByGoogleId(googleId: string): Promise<StoredUser | null> {
  const { users } = await readLocalUsersStore();
  return users.find((u) => u.googleId === googleId) ?? null;
}

export async function findUserByVerificationToken(token: string): Promise<StoredUser | null> {
  const { users } = await readLocalUsersStore();
  const now = Date.now();
  return (
    users.find((u) => {
      if (!u.verificationToken || u.verificationToken !== token) return false;
      if (!u.verificationExpires) return false;
      return new Date(u.verificationExpires).getTime() > now;
    }) ?? null
  );
}

export async function findUserByResetToken(token: string): Promise<StoredUser | null> {
  const { users } = await readLocalUsersStore();
  const now = Date.now();
  return (
    users.find((u) => {
      if (!u.resetPasswordToken || u.resetPasswordToken !== token) return false;
      if (!u.resetPasswordExpires) return false;
      return new Date(u.resetPasswordExpires).getTime() > now;
    }) ?? null
  );
}

export interface CreateLocalUserInput {
  email: string;
  passwordHash: string | null;
  role: 'athlete' | 'brand';
  name: string;
  googleId?: string;
  /** Local MVP: default true so sign-in works without email delivery. */
  verified?: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
}

export async function createLocalUser(input: CreateLocalUserInput): Promise<StoredUser> {
  const _id = newObjectIdHex();
  const verified = input.verified !== false;
  const row: StoredUser = {
    _id,
    email: normalizeEmail(input.email),
    password: input.passwordHash,
    role: input.role,
    name: input.name.trim(),
    googleId: input.googleId,
    verified,
    verificationToken: input.verificationToken,
    verificationExpires: input.verificationExpires?.toISOString(),
    createdAt: new Date().toISOString(),
  };

  await mutateLocalUsersStore((draft) => {
    if (draft.users.some((u) => normalizeEmail(u.email) === row.email)) {
      throw new Error('User already exists');
    }
    draft.users.push(row);
  });

  return row;
}

export type UserPatch = {
  password?: string | null;
  googleId?: string;
  verified?: boolean;
  name?: string;
  /** Merged into existing athlete profile (athlete accounts only). */
  athleteProfile?: Partial<AthleteProfile>;
  /** Pass `null` to remove optional token fields from the stored record. */
  verificationToken?: string | null;
  verificationExpires?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: string | null;
};

export async function updateLocalUser(id: string, patch: UserPatch): Promise<StoredUser | null> {
  let updated: StoredUser | null = null;
  await mutateLocalUsersStore((draft) => {
    const idx = draft.users.findIndex((u) => u._id === id);
    if (idx === -1) return;
    const next = { ...draft.users[idx] } as StoredUser;
    if (patch.password !== undefined) next.password = patch.password;
    if (patch.googleId !== undefined) next.googleId = patch.googleId;
    if (patch.verified !== undefined) next.verified = patch.verified;
    if (patch.verificationToken === null) {
      delete next.verificationToken;
      delete next.verificationExpires;
    } else if (patch.verificationToken !== undefined) {
      next.verificationToken = patch.verificationToken;
    }
    if (patch.verificationExpires === null) {
      delete next.verificationExpires;
    } else if (patch.verificationExpires !== undefined && patch.verificationExpires !== null) {
      const v = patch.verificationExpires;
      next.verificationExpires = typeof v === 'string' ? v : new Date(v).toISOString();
    }
    if (patch.resetPasswordToken === null) {
      delete next.resetPasswordToken;
      delete next.resetPasswordExpires;
    } else if (patch.resetPasswordToken !== undefined) {
      next.resetPasswordToken = patch.resetPasswordToken;
    }
    if (patch.resetPasswordExpires === null) {
      delete next.resetPasswordExpires;
    } else if (patch.resetPasswordExpires !== undefined && patch.resetPasswordExpires !== null) {
      const v = patch.resetPasswordExpires;
      next.resetPasswordExpires = typeof v === 'string' ? v : new Date(v).toISOString();
    }
    if (patch.name !== undefined) next.name = patch.name.trim() || next.name;
    if (patch.athleteProfile !== undefined) {
      const merged = mergeAthleteProfile(next.athleteProfile);
      next.athleteProfile = { ...merged, ...patch.athleteProfile };
    }
    draft.users[idx] = next;
    updated = next;
  });
  return updated;
}

export function newVerificationToken(): { token: string; expires: Date } {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

export function newResetToken(): { token: string; expires: Date } {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expires: new Date(Date.now() + 60 * 60 * 1000),
  };
}
