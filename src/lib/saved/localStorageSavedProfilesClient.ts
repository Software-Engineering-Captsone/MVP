import type { SavedProfilesClient } from './SavedProfilesClient';
import { EMPTY_SAVED_SNAPSHOT, type SavedSnapshot } from './types';

/** Single key for atomic read/write (preferred). */
const SNAPSHOT_KEY = 'nilink_saved_snapshot_v1';
/** Legacy keys from earlier MVP builds — migrated on first load. */
const LEGACY_ATHLETES = 'nilink_saved_athletes_v1';
const LEGACY_BRANDS = 'nilink_saved_brands_v1';

function readJsonIds(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function readSnapshotFromStorage(): SavedSnapshot {
  if (typeof window === 'undefined') return { ...EMPTY_SAVED_SNAPSHOT };
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as SavedSnapshot).athleteIds) &&
        Array.isArray((parsed as SavedSnapshot).brandIds)
      ) {
        const s = parsed as SavedSnapshot;
        return {
          athleteIds: s.athleteIds.filter((x) => typeof x === 'string'),
          brandIds: s.brandIds.filter((x) => typeof x === 'string'),
        };
      }
    }
  } catch {
    /* fall through to legacy */
  }

  const athleteIds = readJsonIds(LEGACY_ATHLETES);
  const brandIds = readJsonIds(LEGACY_BRANDS);
  return { athleteIds, brandIds };
}

export function createLocalStorageSavedProfilesClient(): SavedProfilesClient {
  return {
    async load() {
      const snapshot = readSnapshotFromStorage();
      const hasLegacyOnly =
        typeof window !== 'undefined' &&
        !localStorage.getItem(SNAPSHOT_KEY) &&
        (localStorage.getItem(LEGACY_ATHLETES) || localStorage.getItem(LEGACY_BRANDS));
      if (hasLegacyOnly && (snapshot.athleteIds.length > 0 || snapshot.brandIds.length > 0)) {
        try {
          localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
        } catch {
          /* ignore quota */
        }
      }
      return snapshot;
    },

    async save(snapshot: SavedSnapshot) {
      if (typeof window === 'undefined') return;
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    },
  };
}
