'use client';

import { useState, useCallback, useEffect } from 'react';
import { loadOnboardingState, hydrateOnboardingDraft } from '@/lib/onboardingHydrate';
import {
  persistBasics,
  persistAthletic,
  persistAcademic,
  persistCompliance,
  persistProfileSection,
} from '@/lib/onboardingPersist';

/* ──────────────────────────────────────────────────────────────
 *  Onboarding draft types
 * ────────────────────────────────────────────────────────────── */

export interface OnboardingBasics {
  fullName: string;
  email: string;
  alternateEmail: string;
  phone: string;
  contactPreference: 'email' | 'phone' | 'both' | '';
  country: string;
}

export interface SportEntry {
  id: string;
  sport: string;
  position: string;
}

export interface OnboardingAthletic {
  sports: SportEntry[];
}

export interface OnboardingAcademic {
  school: string;
  schoolDomain: string; // e.g. "unc.edu"
  schoolEmail: string;  // .edu email used for verification
  currentYear: string;
  eligibilityStatus: string;
  eligibilityYears: string;
}

export interface OnboardingCompliance {
  schoolEmailVerified: boolean;
  idVerified: boolean;
  acoEmail: string;
  nilDisclosureRequired: 'yes' | 'no' | '';
}

export interface OnboardingSocials {
  instagram: string;
  tiktok: string;
  twitter: string;
  other: string;
}

export interface OnboardingProfile {
  profilePictureUrl: string;
  profileBannerUrl: string;
  bio: string;
  socials: OnboardingSocials;
  socialMediaFollowing: string;
  availabilityStatus: 'available' | 'busy' | 'not_looking' | '';
}

export interface OnboardingDraft {
  currentStep: number;
  basics: OnboardingBasics;
  athletic: OnboardingAthletic;
  academic: OnboardingAcademic;
  compliance: OnboardingCompliance;
  profile: OnboardingProfile;
  completedAt?: string;
}

/* ──────────────────────────────────────────────────────────────
 *  Defaults
 * ────────────────────────────────────────────────────────────── */

export const defaultDraft: OnboardingDraft = {
  currentStep: 1,
  basics: {
    fullName: '',
    email: '',
    alternateEmail: '',
    phone: '',
    contactPreference: '',
    country: 'United States',
  },
  athletic: {
    sports: [],
  },
  academic: {
    school: '',
    schoolDomain: '',
    schoolEmail: '',
    currentYear: '',
    eligibilityStatus: '',
    eligibilityYears: '',
  },
  compliance: {
    schoolEmailVerified: false,
    idVerified: false,
    acoEmail: '',
    nilDisclosureRequired: '',
  },
  profile: {
    profilePictureUrl: '',
    profileBannerUrl: '',
    bio: '',
    socials: { instagram: '', tiktok: '', twitter: '', other: '' },
    socialMediaFollowing: '',
    availabilityStatus: '',
  },
};

/* ──────────────────────────────────────────────────────────────
 *  Storage key & helpers
 * ────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'athlete_onboarding_draft';

function loadDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return { ...defaultDraft };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultDraft };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;

    // Migrate legacy flat sport/position → sports[]
    const rawAthletic = parsed.athletic ?? {};
    let sports: SportEntry[] = rawAthletic.sports ?? [];
    if (sports.length === 0 && rawAthletic.sport) {
      sports = [{ id: String(Date.now()), sport: rawAthletic.sport, position: rawAthletic.position ?? '' }];
    }

    // Migrate: old athletic had school/year/eligibility fields → move to academic
    const rawAcademic = parsed.academic ?? {};
    const migratedAcademic: OnboardingAcademic = {
      ...defaultDraft.academic,
      ...rawAcademic,
      school: rawAcademic.school || rawAthletic.school || '',
      currentYear: rawAcademic.currentYear || rawAthletic.currentYear || '',
      eligibilityStatus: rawAcademic.eligibilityStatus || rawAthletic.eligibilityStatus || '',
      eligibilityYears: rawAcademic.eligibilityYears || rawAthletic.eligibilityYears || '',
      schoolEmail: rawAcademic.schoolEmail || parsed.compliance?.schoolEmail || '',
    };

    return {
      ...defaultDraft,
      ...parsed,
      basics: { ...defaultDraft.basics, ...parsed.basics },
      athletic: { sports },
      academic: migratedAcademic,
      compliance: { ...defaultDraft.compliance, ...parsed.compliance },
      profile: {
        ...defaultDraft.profile,
        ...parsed.profile,
        socials: {
          ...defaultDraft.profile.socials,
          ...(parsed.profile?.socials ?? {}),
        },
      },
    };
  } catch {
    return { ...defaultDraft };
  }
}

function persistDraft(draft: OnboardingDraft) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota exceeded — silently ignore for prototype */
  }
}

/* ──────────────────────────────────────────────────────────────
 *  Hook
 * ────────────────────────────────────────────────────────────── */

export function useOnboardingStorage() {
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const localDraft = loadDraft();
      const localKeyExists =
        typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) !== null;
      const localCompleted = !!localDraft.completedAt;

      // If the user has unsaved typing on this device (key present, not yet
      // marked complete), trust localStorage so we don't clobber their work.
      // Otherwise — fresh device, or "Re-run onboarding" — pull truth from DB.
      if (localKeyExists && !localCompleted) {
        if (!cancelled) {
          setDraft(localDraft);
          setHydrated(true);
        }
        return;
      }

      try {
        const state = await loadOnboardingState();
        const dbDraft = hydrateOnboardingDraft(state);
        if (!cancelled) {
          setDraft(dbDraft);
          persistDraft(dbDraft);
        }
      } catch {
        // DB unreachable — fall back to whatever localStorage has (may be defaults).
        if (!cancelled) {
          setDraft(localDraft);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDraft = useCallback(
    (patch: Partial<OnboardingDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        persistDraft(next);
        return next;
      });
    },
    [],
  );

  const updateBasics = useCallback(
    (patch: Partial<OnboardingBasics>) => {
      setDraft((prev) => {
        const next = { ...prev, basics: { ...prev.basics, ...patch } };
        persistDraft(next);
        return next;
      });
    },
    [],
  );

  const updateAthletic = useCallback(
    (patch: Partial<OnboardingAthletic>) => {
      setDraft((prev) => {
        const next = { ...prev, athletic: { ...prev.athletic, ...patch } };
        persistDraft(next);
        return next;
      });
    },
    [],
  );

  const updateAcademic = useCallback(
    (patch: Partial<OnboardingAcademic>) => {
      setDraft((prev) => {
        const next = { ...prev, academic: { ...prev.academic, ...patch } };
        persistDraft(next);
        return next;
      });
    },
    [],
  );

  const updateCompliance = useCallback(
    (patch: Partial<OnboardingCompliance>) => {
      setDraft((prev) => {
        const next = { ...prev, compliance: { ...prev.compliance, ...patch } };
        persistDraft(next);
        return next;
      });
    },
    [],
  );

  const updateProfile = useCallback(
    (patch: Partial<OnboardingProfile>) => {
      setDraft((prev) => {
        const next = {
          ...prev,
          profile: {
            ...prev.profile,
            ...patch,
            socials: {
              ...prev.profile.socials,
              ...(patch.socials ?? {}),
            },
          },
        };
        persistDraft(next);
        return next;
      });
    },
    [],
  );

  const resetDraft = useCallback(() => {
    const fresh = { ...defaultDraft };
    persistDraft(fresh);
    setDraft(fresh);
  }, []);

  /**
   * Pushes the given step's section to the DB via its persist helper.
   * Caller (the wizard) is expected to await this BEFORE advancing the
   * step so failures keep the user on the page they need to retry.
   */
  const commitStep = useCallback(
    async (step: number): Promise<void> => {
      setSyncing(true);
      setSyncError(null);
      try {
        switch (step) {
          case 1:
            await persistBasics(draft.basics);
            break;
          case 2:
            await persistAthletic(draft.athletic);
            break;
          case 3:
            await persistAcademic(draft.academic);
            break;
          case 4:
            await persistCompliance(draft.compliance);
            break;
          case 5:
            await persistProfileSection(draft.profile);
            break;
          default:
            break;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not save this step';
        setSyncError(msg);
        throw err;
      } finally {
        setSyncing(false);
      }
    },
    [draft]
  );

  return {
    draft,
    hydrated,
    syncing,
    syncError,
    updateDraft,
    updateBasics,
    updateAthletic,
    updateAcademic,
    updateCompliance,
    updateProfile,
    resetDraft,
    commitStep,
  } as const;
}
