/**
 * Saved marketplace profiles — same idea as `marketplaceFetch.ts`:
 * default path uses fast local persistence; set `NEXT_PUBLIC_SAVED_DATA_SOURCE=api`
 * to exercise the HTTP + repository stack before you plug in a database.
 */
export type { SavedSnapshot } from './saved/types';
export type { SavedProfilesClient } from './saved/SavedProfilesClient';
export {
  createSavedProfilesClient,
  savedProfilesDataSourceUsesApi,
} from './saved/factory';
