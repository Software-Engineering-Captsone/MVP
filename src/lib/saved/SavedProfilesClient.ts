import type { SavedSnapshot } from './types';

/**
 * All UI and hooks depend on this contract. Swap implementations via the factory
 * (`createSavedProfilesClient`) when moving from local persistence to a real backend.
 */
export type SavedProfilesClient = {
  load(): Promise<SavedSnapshot>;
  /** Full replace — matches how a DB row or API resource would be updated. */
  save(snapshot: SavedSnapshot): Promise<void>;
};
