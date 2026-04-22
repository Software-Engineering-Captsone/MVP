import { createClient } from '@/lib/supabase/client';
import type {
  BrandCompanyInfo,
  BrandProfileBasics,
} from '@/lib/brandOnboardingPersist';

/**
 * Hydration helpers for the brand-side onboarding/profile editor.
 * Calls the `get_brand_onboarding_state` RPC and maps the snake_case
 * DB JSON into the camelCase `BrandOnboardingDraft` the UI works with.
 * Mirrors src/lib/onboardingHydrate.ts on the athlete side.
 */

type Maybe<T> = T | null | undefined;

interface DbBrandProfile {
  full_name?: Maybe<string>;
  email?: Maybe<string>;
  phone?: Maybe<string>;
  contact_preference?: Maybe<string>;
  country?: Maybe<string>;
  state?: Maybe<string>;
  city?: Maybe<string>;
  avatar_url?: Maybe<string>;
  banner_url?: Maybe<string>;
  bio?: Maybe<string>;
  onboarding_completed_at?: Maybe<string>;
}

interface DbBrandCompany {
  company_name?: Maybe<string>;
  industry?: Maybe<string>;
  company_size?: Maybe<string>;
  website?: Maybe<string>;
  tagline?: Maybe<string>;
  about?: Maybe<string>;
  founded_year?: Maybe<number>;
  hq_country?: Maybe<string>;
  hq_state?: Maybe<string>;
  hq_city?: Maybe<string>;
  budget_tier?: Maybe<string>;
  typical_deal_range?: Maybe<string>;
  primary_contact_role?: Maybe<string>;
}

export interface BrandDbState {
  profile?: Maybe<DbBrandProfile>;
  company?: Maybe<DbBrandCompany>;
}

export interface BrandOnboardingDraft {
  basics: BrandProfileBasics;
  company: BrandCompanyInfo;
  /** Read-only fields pulled from profiles that the UI renders but does
   *  not edit through this path (avatar_url is owned by uploadAvatar,
   *  email is owned by auth). */
  email: string;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  completedAt: string | null;
}

export function defaultBrandDraft(): BrandOnboardingDraft {
  return {
    basics: {
      fullName: '',
      phone: '',
      contactPreference: '',
      country: 'United States',
      state: '',
      city: '',
    },
    company: {
      companyName: '',
      industry: 'Other',
      companySize: '',
      website: '',
      tagline: '',
      about: '',
      foundedYear: '',
      hqCountry: 'United States',
      hqState: '',
      hqCity: '',
      budgetTier: '',
      typicalDealRange: '',
      primaryContactRole: '',
    },
    email: '',
    avatarUrl: '',
    bannerUrl: '',
    bio: '',
    completedAt: null,
  };
}

export async function loadBrandOnboardingState(): Promise<BrandDbState | null> {
  const { data, error } = await createClient().rpc('get_brand_onboarding_state');
  if (error) throw new Error(error.message);
  return (data ?? null) as BrandDbState | null;
}

function str(v: Maybe<string>, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: Maybe<number>): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
}

function contactPref(v: Maybe<string>): 'email' | 'phone' | 'both' | '' {
  return v === 'email' || v === 'phone' || v === 'both' ? v : '';
}

export function hydrateBrandDraft(state: BrandDbState | null): BrandOnboardingDraft {
  if (!state) return defaultBrandDraft();

  const p = state.profile ?? {};
  const c = state.company ?? {};

  return {
    basics: {
      fullName: str(p.full_name),
      phone: str(p.phone),
      contactPreference: contactPref(p.contact_preference),
      country: str(p.country, 'United States'),
      state: str(p.state),
      city: str(p.city),
    },
    company: {
      companyName: str(c.company_name),
      industry: str(c.industry, 'Other'),
      companySize: str(c.company_size),
      website: str(c.website),
      tagline: str(c.tagline),
      about: str(c.about),
      foundedYear: num(c.founded_year),
      hqCountry: str(c.hq_country, 'United States'),
      hqState: str(c.hq_state),
      hqCity: str(c.hq_city),
      budgetTier: str(c.budget_tier),
      typicalDealRange: str(c.typical_deal_range),
      primaryContactRole: str(c.primary_contact_role),
    },
    email: str(p.email),
    avatarUrl: str(p.avatar_url),
    bannerUrl: str(p.banner_url),
    bio: str(p.bio),
    completedAt:
      typeof p.onboarding_completed_at === 'string'
        ? p.onboarding_completed_at
        : null,
  };
}
