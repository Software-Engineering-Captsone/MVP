'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSavedProfilesClient } from '@/lib/savedFetch';
import type { SavedSnapshot } from '@/lib/saved/types';

export function useSavedMarketplace() {
  const client = useRef(createSavedProfilesClient()).current;
  const [athleteIds, setAthleteIds] = useState<string[]>([]);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const athleteIdsRef = useRef<string[]>([]);
  const brandIdsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    client
      .load()
      .then((snap: SavedSnapshot) => {
        if (cancelled) return;
        athleteIdsRef.current = snap.athleteIds;
        brandIdsRef.current = snap.brandIds;
        setAthleteIds(snap.athleteIds);
        setBrandIds(snap.brandIds);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load saved profiles');
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const updateSnapshot = useCallback(
    (mutate: (prev: SavedSnapshot) => SavedSnapshot) => {
      const prev: SavedSnapshot = {
        athleteIds: athleteIdsRef.current,
        brandIds: brandIdsRef.current,
      };
      const next = mutate(prev);
      athleteIdsRef.current = next.athleteIds;
      brandIdsRef.current = next.brandIds;
      setAthleteIds(next.athleteIds);
      setBrandIds(next.brandIds);
      void client.save(next).catch((e: unknown) => {
        console.error('[useSavedMarketplace] save failed', e);
        setError(e instanceof Error ? e.message : 'Failed to save');
      });
    },
    [client]
  );

  const toggleAthlete = useCallback(
    (id: string) => {
      updateSnapshot((s) => ({
        athleteIds: s.athleteIds.includes(id) ? s.athleteIds.filter((x) => x !== id) : [...s.athleteIds, id],
        brandIds: s.brandIds,
      }));
    },
    [updateSnapshot]
  );

  const toggleBrand = useCallback(
    (id: string) => {
      updateSnapshot((s) => ({
        athleteIds: s.athleteIds,
        brandIds: s.brandIds.includes(id) ? s.brandIds.filter((x) => x !== id) : [...s.brandIds, id],
      }));
    },
    [updateSnapshot]
  );

  const removeAthlete = useCallback(
    (id: string) => {
      updateSnapshot((s) => ({
        athleteIds: s.athleteIds.filter((x) => x !== id),
        brandIds: s.brandIds,
      }));
    },
    [updateSnapshot]
  );

  const removeBrand = useCallback(
    (id: string) => {
      updateSnapshot((s) => ({
        athleteIds: s.athleteIds,
        brandIds: s.brandIds.filter((x) => x !== id),
      }));
    },
    [updateSnapshot]
  );

  const isAthleteSaved = useCallback((id: string) => athleteIds.includes(id), [athleteIds]);
  const isBrandSaved = useCallback((id: string) => brandIds.includes(id), [brandIds]);

  return {
    hydrated,
    error,
    savedAthleteIds: athleteIds,
    savedBrandIds: brandIds,
    isAthleteSaved,
    isBrandSaved,
    toggleAthlete,
    toggleBrand,
    removeAthlete,
    removeBrand,
  };
}
