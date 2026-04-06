'use client';

import { useState, useEffect, useMemo } from 'react';

export interface University {
  name: string;
  domains: string[];
  web_pages: string[];
  country: string;
  alpha_two_code: string;
  'state-province': string | null;
}

const API_URL = 'http://universities.hipolabs.com/search?country=United+States';

let cachedData: University[] | null = null;

/**
 * Fetches and caches the full list of US universities from the Hipo API.
 * Returns { universities, loading, error } and a search helper.
 */
export function useUniversities() {
  const [universities, setUniversities] = useState<University[]>(cachedData ?? []);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedData) return;

    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as University[];
        // Deduplicate by name and sort
        const seen = new Set<string>();
        const deduped = data.filter((u) => {
          const key = u.name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        deduped.sort((a, b) => a.name.localeCompare(b.name));
        cachedData = deduped;
        if (!cancelled) {
          setUniversities(deduped);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load universities');
          setLoading(false);
        }
      }
    }

    void fetchData();
    return () => { cancelled = true; };
  }, []);

  return { universities, loading, error };
}

/**
 * Given a .edu email domain (e.g. "unc.edu"), find the matching university.
 */
export function findUniversityByDomain(
  universities: University[],
  domain: string,
): University | undefined {
  const lower = domain.toLowerCase();
  return universities.find((u) =>
    u.domains.some((d) => d.toLowerCase() === lower),
  );
}

/**
 * Filter universities by search term (name match).
 */
export function useUniversitySearch(universities: University[], query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return universities
      .filter((u) => u.name.toLowerCase().includes(q))
      .slice(0, 20); // limit results for performance
  }, [universities, query]);
}
