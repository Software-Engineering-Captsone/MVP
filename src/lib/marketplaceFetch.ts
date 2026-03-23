import type { Athlete, Brand } from '@/lib/mockData';
import { mockAthletes, mockBrands } from '@/lib/mockData';

/**
 * When `NEXT_PUBLIC_MARKETPLACE_DATA_SOURCE=api`, callers load marketplace rows from `/api/marketplace/*`.
 * Otherwise (default), bundled mock data is used — ideal for local development without a database.
 */
export function marketplaceUsesMockData(): boolean {
  return process.env.NEXT_PUBLIC_MARKETPLACE_DATA_SOURCE !== 'api';
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
