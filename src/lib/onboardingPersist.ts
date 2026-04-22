import { createClient } from '@/lib/supabase/client';
import type {
  OnboardingBasics,
  OnboardingAthletic,
  OnboardingAcademic,
  OnboardingCompliance,
  OnboardingProfile,
} from '@/hooks/useOnboardingStorage';

/**
 * One persist helper per onboarding step. Each is a typed wrapper around
 * the matching `*` RPC defined in supabase-onboarding-rpc.sql.
 *
 * camelCase (TS draft shape) → snake_case (DB column shape) mapping
 * lives here, and only here — the wizard components never see snake_case
 * and the SQL functions never see camelCase.
 */

function supabase() {
  return createClient();
}

export async function persistBasics(b: OnboardingBasics): Promise<void> {
  const { error } = await supabase().rpc('upsert_athlete_basics', {
    payload: {
      full_name: b.fullName,
      alternate_email: b.alternateEmail,
      phone: b.phone,
      contact_preference: b.contactPreference,
      country: b.country,
    },
  });
  if (error) throw new Error(error.message);
}

export async function persistAthletic(a: OnboardingAthletic): Promise<void> {
  const { error } = await supabase().rpc('upsert_athlete_sports', {
    payload: a.sports.map((s, i) => ({
      sport: s.sport,
      position: s.position,
      jersey_number: '',
      // First sport in the list is the athlete's "main" — brands
      // searching for that sport want primary players first.
      is_primary: i === 0,
    })),
  });
  if (error) throw new Error(error.message);
}

export async function persistAcademic(a: OnboardingAcademic): Promise<void> {
  const { error } = await supabase().rpc('upsert_athlete_academic', {
    payload: {
      school: a.school,
      school_domain: a.schoolDomain,
      school_email: a.schoolEmail,
      current_year: a.currentYear,
      eligibility_status: a.eligibilityStatus,
      eligibility_years: a.eligibilityYears,
    },
  });
  if (error) throw new Error(error.message);
}

export async function persistCompliance(c: OnboardingCompliance): Promise<void> {
  const { error } = await supabase().rpc('upsert_athlete_compliance', {
    payload: {
      school_email_verified: c.schoolEmailVerified,
      id_verified: c.idVerified,
      aco_email: c.acoEmail,
      nil_disclosure_required: c.nilDisclosureRequired === 'yes',
    },
  });
  if (error) throw new Error(error.message);
}

export async function persistProfileSection(p: OnboardingProfile): Promise<void> {
  const { error } = await supabase().rpc('upsert_athlete_profile_section', {
    payload: {
      profile: {
        bio: p.bio,
        banner_url: p.profileBannerUrl,
        availability_status: p.availabilityStatus,
      },
      socials: {
        instagram: p.socials.instagram,
        tiktok: p.socials.tiktok,
        twitter: p.socials.twitter,
        other_platform: p.socials.other,
      },
    },
  });
  if (error) throw new Error(error.message);
}

export async function markOnboardingComplete(): Promise<string> {
  const { data, error } = await supabase().rpc('mark_athlete_onboarding_complete');
  if (error) throw new Error(error.message);
  return data as string;
}
