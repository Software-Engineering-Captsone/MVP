'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Athlete, Brand } from '@/lib/mockData';
import { fetchAthletesCatalog, fetchBrandsCatalog } from '@/lib/marketplaceFetch';

export function useMarketplaceCatalog() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, a] = await Promise.all([fetchBrandsCatalog(), fetchAthletesCatalog()]);
        if (!cancelled) {
          setBrands(b);
          setAthletes(a);
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
