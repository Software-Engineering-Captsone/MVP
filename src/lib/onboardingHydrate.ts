import { createClient } from '@/lib/supabase/client';
import { defaultDraft, type OnboardingDraft, type SportEntry } from '@/hooks/useOnboardingStorage';

/**
 * Hydration: fetch the authenticated athlete's onboarding state via the
 * `get_athlete_onboarding_state` RPC and rebuild an OnboardingDraft from
 * it. Used on mount in the wizard so partial progress on Device A
 * resumes correctly on Device B.
 *
 * snake_case → camelCase mapping mirrors `onboardingPersist.ts` so the
 * round-trip (persist → hydrate → persist again) is lossless.
 */

type Maybe<T> = T | null | undefined;

interface DbBasics {
  full_name?: Maybe<string>;
  email?: Maybe<string>;
  alternate_email?: Maybe<string>;
  phone?: Maybe<string>;
  contact_preference?: Maybe<string>;
  country?: Maybe<string>;
}

interface DbSport {
  id?: Maybe<string>;
  sport?: Maybe<string>;
  position?: Maybe<string>;
  jersey_number?: Maybe<string>;
  is_primary?: Maybe<boolean>;
}

interface DbAthletic {
  sports?: Maybe<DbSport[]>;
}

interface DbAcademic {
  school?: Maybe<string>;
  school_domain?: Maybe<string>;
  school_email?: Maybe<string>;
  current_year?: Maybe<string>;
  eligibility_status?: Maybe<string>;
  eligibility_years?: Maybe<number>;
}

interface DbCompliance {
  school_email_verified?: Maybe<boolean>;
  id_verified?: Maybe<boolean>;
  aco_email?: Maybe<string>;
  nil_disclosure_required?: Maybe<boolean>;
}

interface DbProfile {
  bio?: Maybe<string>;
  avatar_url?: Maybe<string>;
  banner_url?: Maybe<string>;
  availability_status?: Maybe<string>;
  onboarding_completed_at?: Maybe<string>;
}

interface DbSocials {
  instagram?: Maybe<string>;
  tiktok?: Maybe<string>;
  twitter?: Maybe<string>;
  other_platform?: Maybe<string>;
}

export interface OnboardingDbState {
  basics?: Maybe<DbBasics>;
  athletic?: Maybe<DbAthletic>;
  academic?: Maybe<DbAcademic>;
  compliance?: Maybe<DbCompliance>;
  profile?: Maybe<DbProfile>;
  socials?: Maybe<DbSocials>;
}

export async function loadOnboardingState(): Promise<OnboardingDbState | null> {
  const { data, error } = await createClient().rpc('get_athlete_onboarding_state');
  if (error) throw new Error(error.message);
  return (data ?? null) as OnboardingDbState | null;
}

function str(v: Maybe<string>, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: Maybe<number>): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
}

function bool(v: Maybe<boolean>): boolean {
  return v === true;
}

function contactPref(v: Maybe<string>): 'email' | 'phone' | 'both' | '' {
  return v === 'email' || v === 'phone' || v === 'both' ? v : '';
}

function availability(v: Maybe<string>): 'available' | 'busy' | 'not_looking' | '' {
  return v === 'available' || v === 'busy' || v === 'not_looking' ? v : '';
}

function nilDisclosure(v: Maybe<boolean>): 'yes' | 'no' | '' {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '';
}

function mapSports(rows: Maybe<DbSport[]>): SportEntry[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => typeof r?.sport === 'string' && r.sport.length > 0)
    .map((r) => ({
      id: str(r.id, String(Math.random())),
      sport: str(r.sport),
      position: str(r.position),
    }));
}

/**
 * Infer the wizard's current step from how much of the draft is filled.
 * Lowest step with no data wins, capped at 5. If onboarding is already
 * complete, return 5 (the success-state UI handles the rest).
 */
export function inferCurrentStep(state: OnboardingDbState | null): number {
  if (!state) return 1;
  if (state.profile?.onboarding_completed_at) return 5;

  const hasBasics = !!state.basics?.full_name;
  const hasSports = (state.athletic?.sports?.length ?? 0) > 0;
  const hasAcademic = !!state.academic?.school;
  const hasCompliance =
    bool(state.compliance?.school_email_verified) ||
    bool(state.compliance?.id_verified) ||
    !!state.compliance?.aco_email;
  const hasProfile = !!state.profile?.bio || !!state.profile?.banner_url;

  if (!hasBasics) return 1;
  if (!hasSports) return 2;
  if (!hasAcademic) return 3;
  if (!hasCompliance) return 4;
  if (!hasProfile) return 5;
  return 5;
}

export function hydrateOnboardingDraft(state: OnboardingDbState | null): OnboardingDraft {
  if (!state) return { ...defaultDraft };

  const b = state.basics ?? {};
  const ath = state.athletic ?? {};
  const ac = state.academic ?? {};
  const c = state.compliance ?? {};
  const p = state.profile ?? {};
  const s = state.socials ?? {};

  return {
    currentStep: inferCurrentStep(state),
    basics: {
      fullName: str(b.full_name, defaultDraft.basics.fullName),
      email: str(b.email, defaultDraft.basics.email),
      alternateEmail: str(b.alternate_email),
      phone: str(b.phone),
      contactPreference: contactPref(b.contact_preference),
      country: str(b.country, defaultDraft.basics.country),
    },
    athletic: {
      sports: mapSports(ath.sports),
    },
    academic: {
      school: str(ac.school),
      schoolDomain: str(ac.school_domain),
      schoolEmail: str(ac.school_email),
      currentYear: str(ac.current_year),
      eligibilityStatus: str(ac.eligibility_status),
      eligibilityYears: num(ac.eligibility_years),
    },
    compliance: {
      schoolEmailVerified: bool(c.school_email_verified),
      idVerified: bool(c.id_verified),
      acoEmail: str(c.aco_email),
      nilDisclosureRequired: nilDisclosure(c.nil_disclosure_required),
    },
    profile: {
      profilePictureUrl: str(p.avatar_url),
      profileBannerUrl: str(p.banner_url),
      bio: str(p.bio),
      socials: {
        instagram: str(s.instagram),
        tiktok: str(s.tiktok),
        twitter: str(s.twitter),
        other: str(s.other_platform),
      },
      socialMediaFollowing: '',
      availabilityStatus: availability(p.availability_status),
    },
    completedAt: typeof p.onboarding_completed_at === 'string'
      ? p.onboarding_completed_at
      : undefined,
  };
}
