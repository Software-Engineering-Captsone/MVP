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

function followerCount(value: string): number {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
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
  const client = supabase();
  const { error } = await client.rpc('upsert_athlete_profile_section', {
    payload: {
      profile: {
        bio: p.bio,
        banner_url: p.profileBannerUrl,
        availability_status: p.availabilityStatus,
      },
      socials: {
        instagram: p.socials.instagram,
        instagram_followers: p.socials.instagramFollowers,
        tiktok: p.socials.tiktok,
        tiktok_followers: p.socials.tiktokFollowers,
        twitter: p.socials.twitter,
        youtube: p.socials.youtube,
      },
    },
  });
  if (error) throw new Error(error.message);

  // Keep launch social metrics working even if an environment still has the
  // older RPC definition that saved handles but ignored follower counts.
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(authError.message);
  const userId = authData.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { error: socialsError } = await client
    .from('athlete_socials')
    .upsert(
      {
        athlete_id: userId,
        instagram: p.socials.instagram,
        instagram_followers: followerCount(p.socials.instagramFollowers),
        tiktok: p.socials.tiktok,
        tiktok_followers: followerCount(p.socials.tiktokFollowers),
        twitter: p.socials.twitter,
      },
      { onConflict: 'athlete_id' },
    );
  if (socialsError) throw new Error(socialsError.message);
}

export async function markOnboardingComplete(): Promise<string> {
  const { data, error } = await supabase().rpc('mark_athlete_onboarding_complete');
  if (error) throw new Error(error.message);
  return data as string;
}
