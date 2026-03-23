import type { SavedProfilesClient } from './SavedProfilesClient';
import type { SavedSnapshot } from './types';
import { isValidSavedSnapshot } from './types';

export function createHttpSavedProfilesClient(basePath = '/api/saved'): SavedProfilesClient {
  return {
    async load() {
      const res = await fetch(basePath, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to load saved profiles (${res.status})`);
      }
      const data: unknown = await res.json();
      if (!isValidSavedSnapshot(data)) {
        throw new Error('Invalid saved profiles response');
      }
      return data;
    },

    async save(snapshot: SavedSnapshot) {
      const res = await fetch(basePath, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
      if (!res.ok) {
        throw new Error(`Failed to save profiles (${res.status})`);
      }
    },
  };
}
