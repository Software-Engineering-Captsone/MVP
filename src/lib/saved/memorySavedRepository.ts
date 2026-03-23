import type { SavedSnapshot } from './types';
import { EMPTY_SAVED_SNAPSHOT } from './types';

/**
 * Server-only persistence for `/api/saved` in local API mode.
 * Replace this module’s implementation with DB calls when you add Mongo —
 * keep `getSavedSnapshotForUser` / `setSavedSnapshotForUser` signatures stable.
 */
const memory = new Map<string, SavedSnapshot>();

export function getSavedSnapshotForUser(userKey: string): SavedSnapshot {
  const row = memory.get(userKey);
  if (!row) {
    return { ...EMPTY_SAVED_SNAPSHOT };
  }
  return {
    athleteIds: [...row.athleteIds],
    brandIds: [...row.brandIds],
  };
}

export function setSavedSnapshotForUser(userKey: string, snapshot: SavedSnapshot) {
  memory.set(userKey, {
    athleteIds: [...snapshot.athleteIds],
    brandIds: [...snapshot.brandIds],
  });
}
