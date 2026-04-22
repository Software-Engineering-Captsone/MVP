import { createClient } from '@/lib/supabase/client';

/**
 * Client wrappers for the brand onboarding RPCs defined in
 * supabase-business-rpc.sql. Mirrors src/lib/onboardingPersist.ts on
 * the athlete side.
 *
 * camelCase (TS draft shape) ↔ snake_case (DB column shape) mapping
 * lives in this file only. Components never see snake_case; RPCs
 * never see camelCase.
 */

export interface BrandProfileBasics {
  fullName: string;
  phone: string;
  contactPreference: 'email' | 'phone' | 'both' | '';
  country: string;
  state: string;
  city: string;
}

export interface BrandCompanyInfo {
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  tagline: string;
  about: string;
  /** Kept as a string because it's backed by a form input.
   *  Empty string → NULL on the RPC side via nullif(..., ''). */
  foundedYear: string;
  hqCountry: string;
  hqState: string;
  hqCity: string;
  budgetTier: string;
  typicalDealRange: string;
  primaryContactRole: string;
}

function supabase() {
  return createClient();
}

export async function persistBrandCompanyInfo(
  basics: BrandProfileBasics,
  company: BrandCompanyInfo,
): Promise<void> {
  const { error } = await supabase().rpc('upsert_brand_company_info', {
    payload: {
      profile: {
        full_name: basics.fullName,
        phone: basics.phone,
        contact_preference: basics.contactPreference,
        country: basics.country,
        state: basics.state,
        city: basics.city,
      },
      company: {
        company_name: company.companyName,
        industry: company.industry,
        company_size: company.companySize,
        website: company.website,
        tagline: company.tagline,
        about: company.about,
        founded_year: company.foundedYear,
        hq_country: company.hqCountry,
        hq_state: company.hqState,
        hq_city: company.hqCity,
        budget_tier: company.budgetTier,
        typical_deal_range: company.typicalDealRange,
        primary_contact_role: company.primaryContactRole,
      },
    },
  });
  if (error) throw new Error(error.message);
}

export async function markBrandOnboardingComplete(): Promise<string> {
  const { data, error } = await supabase().rpc('mark_brand_onboarding_complete');
  if (error) throw new Error(error.message);
  return data as string;
}
