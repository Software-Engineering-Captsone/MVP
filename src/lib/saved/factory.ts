import { createHttpSavedProfilesClient } from './httpSavedProfilesClient';
import { createLocalStorageSavedProfilesClient } from './localStorageSavedProfilesClient';
import type { SavedProfilesClient } from './SavedProfilesClient';

/**
 * `/api/saved` is backed by Supabase (saved_athletes / saved_brands tables).
 * Default to the API client so saved lists persist per-user across devices.
 * Set `NEXT_PUBLIC_SAVED_DATA_SOURCE=local` to fall back to localStorage
 * (useful for offline dev or signed-out demo states).
 */
export function savedProfilesDataSourceUsesApi(): boolean {
  return process.env.NEXT_PUBLIC_SAVED_DATA_SOURCE !== 'local';
}

export function createSavedProfilesClient(): SavedProfilesClient {
  return savedProfilesDataSourceUsesApi()
    ? createHttpSavedProfilesClient()
    : createLocalStorageSavedProfilesClient();
}
