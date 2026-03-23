import { createHttpSavedProfilesClient } from './httpSavedProfilesClient';
import { createLocalStorageSavedProfilesClient } from './localStorageSavedProfilesClient';
import type { SavedProfilesClient } from './SavedProfilesClient';

/**
 * When `NEXT_PUBLIC_SAVED_DATA_SOURCE=api`, reads/writes go through `/api/saved`
 * (today backed by an in-memory store; later swap the route implementation for Mongo).
 * Otherwise (default) uses localStorage via `createLocalStorageSavedProfilesClient`.
 */
export function savedProfilesDataSourceUsesApi(): boolean {
  return process.env.NEXT_PUBLIC_SAVED_DATA_SOURCE === 'api';
}

export function createSavedProfilesClient(): SavedProfilesClient {
  return savedProfilesDataSourceUsesApi()
    ? createHttpSavedProfilesClient()
    : createLocalStorageSavedProfilesClient();
}
