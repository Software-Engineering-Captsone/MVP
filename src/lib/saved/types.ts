/**
 * Canonical shape for “saved marketplace profiles” (athletes / brands).
 * Keep in sync with API responses and future DB documents.
 */
export type SavedSnapshot = {
  athleteIds: string[];
  brandIds: string[];
};

export const EMPTY_SAVED_SNAPSHOT: SavedSnapshot = {
  athleteIds: [],
  brandIds: [],
};

export function isValidSavedSnapshot(value: unknown): value is SavedSnapshot {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (!Array.isArray(o.athleteIds) || !Array.isArray(o.brandIds)) return false;
  return (
    o.athleteIds.every((x) => typeof x === 'string') &&
    o.brandIds.every((x) => typeof x === 'string')
  );
}
