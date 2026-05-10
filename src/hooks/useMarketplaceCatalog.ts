'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Athlete, Brand } from '@/lib/mockData';
import { fetchAthletesCatalog, fetchBrandsCatalog } from '@/lib/marketplaceFetch';

type MarketplaceCatalogSnapshot = {
  brands: Brand[];
  athletes: Athlete[];
};

let catalogCache: MarketplaceCatalogSnapshot | null = null;
let catalogPromise: Promise<MarketplaceCatalogSnapshot> | null = null;

async function loadMarketplaceCatalog(): Promise<MarketplaceCatalogSnapshot> {
  if (catalogCache) return catalogCache;
  if (!catalogPromise) {
    catalogPromise = Promise.all([fetchBrandsCatalog(), fetchAthletesCatalog()])
      .then(([brands, athletes]) => {
        catalogCache = { brands, athletes };
        return catalogCache;
      })
      .finally(() => {
        catalogPromise = null;
      });
  }
  return catalogPromise;
}

export function useMarketplaceCatalog() {
  const [brands, setBrands] = useState<Brand[]>(() => catalogCache?.brands ?? []);
  const [athletes, setAthletes] = useState<Athlete[]>(() => catalogCache?.athletes ?? []);
  const [loading, setLoading] = useState(() => catalogCache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalogCache) {
      setBrands(catalogCache.brands);
      setAthletes(catalogCache.athletes);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const snapshot = await loadMarketplaceCatalog();
        if (!cancelled) {
          setBrands(snapshot.brands);
          setAthletes(snapshot.athletes);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load marketplace data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const brandsById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  return { brands, athletes, brandsById, loading, error };
}
