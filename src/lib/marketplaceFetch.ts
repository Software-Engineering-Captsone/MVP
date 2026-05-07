import type { Athlete, Brand } from '@/lib/mockData';
import { mockAthletes, mockBrands } from '@/lib/mockData';

/**
 * `/api/marketplace/*` is backed by Supabase (profiles + athlete_* / brand_* tables).
 * Default to the API so discovery surfaces real onboarded users.
 * Set `NEXT_PUBLIC_MARKETPLACE_DATA_SOURCE=mock` to fall back to bundled fixtures
 * (useful for offline dev or design demos).
 *
 * Saved lists follow the same pattern via `saved/factory.ts` (opt-out with
 * `NEXT_PUBLIC_SAVED_DATA_SOURCE=local`).
 */
export function marketplaceUsesMockData(): boolean {
  return process.env.NEXT_PUBLIC_MARKETPLACE_DATA_SOURCE === 'mock';
}

export async function fetchBrandsCatalog(): Promise<Brand[]> {
  if (marketplaceUsesMockData()) {
    return mockBrands;
  }
  const res = await fetch('/api/marketplace/brands', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load brands (${res.status})`);
  }
  return res.json() as Promise<Brand[]>;
}

export async function fetchAthletesCatalog(): Promise<Athlete[]> {
  if (marketplaceUsesMockData()) {
    return mockAthletes;
  }
  const res = await fetch('/api/marketplace/athletes', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load athletes (${res.status})`);
  }
  return res.json() as Promise<Athlete[]>;
}
