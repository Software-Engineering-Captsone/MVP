/** Athlete-only profile fields persisted on `StoredUser.athleteProfile` (local JSON store). */
export interface AthleteProfile {
  sport: string;
  position: string;
  school: string;
  year: string;
  bio: string;
  achievements: string;
  instagram: string;
  instagramFollowers: string;
  twitter: string;
  twitterFollowers: string;
  tiktok: string;
  tiktokFollowers: string;
  /** Optional future: custom headshot URL */
  imageUrl: string;
}

export const ATHLETE_PROFILE_KEYS: (keyof AthleteProfile)[] = [
  'sport',
  'position',
  'school',
  'year',
  'bio',
  'achievements',
  'instagram',
  'instagramFollowers',
  'twitter',
  'twitterFollowers',
  'tiktok',
  'tiktokFollowers',
  'imageUrl',
];

export function defaultAthleteProfile(): AthleteProfile {
  return {
    sport: '',
    position: '',
    school: '',
    year: '',
    bio: '',
    achievements: '',
    instagram: '',
    instagramFollowers: '',
    twitter: '',
    twitterFollowers: '',
    tiktok: '',
    tiktokFollowers: '',
    imageUrl: '',
  };
}

export function mergeAthleteProfile(partial?: Partial<AthleteProfile> | null): AthleteProfile {
  return { ...defaultAthleteProfile(), ...partial };
}

const LONG = 4000;
const SHORT = 240;

export function sanitizeAthleteProfilePatch(raw: unknown): Partial<AthleteProfile> {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<AthleteProfile> = {};
  for (const key of ATHLETE_PROFILE_KEYS) {
    const v = o[key];
    if (typeof v !== 'string') continue;
    const max = key === 'bio' || key === 'achievements' ? LONG : SHORT;
    out[key] = v.trim().slice(0, max);
  }
  return out;
}
