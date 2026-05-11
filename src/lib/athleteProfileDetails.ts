import { createClient } from '@/lib/supabase/client';

export type AthleteContentDraftType = 'image' | 'video';

export interface AthleteAchievementDraft {
  id: string;
  title: string;
  year: string;
}

export interface AthleteContentDraft {
  id: string;
  type: AthleteContentDraftType;
  mediaUrl: string;
  thumbnailUrl: string;
  caption: string;
  overlayText: string;
  views: string;
  likes: string;
  postedAt: string;
}

export interface AthleteProfileDetailsDraft {
  hometown: string;
  major: string;
  achievements: AthleteAchievementDraft[];
  contentItems: AthleteContentDraft[];
}

type ProfileDetailsRow = {
  hometown: string | null;
  city: string | null;
  state: string | null;
};

type AcademicDetailsRow = {
  major: string | null;
};

type AchievementRow = {
  id: string;
  title: string | null;
  year: number | null;
  display_order: number | null;
};

type ContentRow = {
  id: string;
  content_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  overlay_text: string | null;
  views: number | null;
  likes: number | null;
  posted_at: string | null;
  display_order: number | null;
};

export function createProfileDetailsDraft(): AthleteProfileDetailsDraft {
  return {
    hometown: '',
    major: '',
    achievements: [],
    contentItems: [],
  };
}

export function createAchievementDraft(): AthleteAchievementDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    year: '',
  };
}

export function createContentDraft(type: AthleteContentDraftType = 'image'): AthleteContentDraft {
  return {
    id: crypto.randomUUID(),
    type,
    mediaUrl: '',
    thumbnailUrl: '',
    caption: '',
    overlayText: '',
    views: '',
    likes: '',
    postedAt: '',
  };
}

function cleanInteger(value: string): number {
  const numeric = Number.parseInt(value.replace(/\D/g, ''), 10);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function cleanYear(value: string): number | null {
  const year = Number.parseInt(value.replace(/\D/g, '').slice(0, 4), 10);
  if (!Number.isFinite(year)) return null;
  return year >= 2000 && year <= 2050 ? year : null;
}

function displayHometown(profile: ProfileDetailsRow | null): string {
  const explicit = profile?.hometown?.trim();
  if (explicit) return explicit;
  return [profile?.city, profile?.state].filter(Boolean).join(', ');
}

async function currentUserId(): Promise<string> {
  const { data, error } = await createClient().auth.getUser();
  if (error) throw new Error(error.message);
  const userId = data.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export async function loadAthleteProfileDetails(): Promise<AthleteProfileDetailsDraft> {
  const client = createClient();
  const userId = await currentUserId();

  const [profileRes, academicRes, achievementsRes, contentRes] = await Promise.all([
    client
      .from('profiles')
      .select('hometown, city, state')
      .eq('id', userId)
      .maybeSingle<ProfileDetailsRow>(),
    client
      .from('athlete_academics')
      .select('major')
      .eq('athlete_id', userId)
      .maybeSingle<AcademicDetailsRow>(),
    client
      .from('athlete_achievements')
      .select('id, title, year, display_order')
      .eq('athlete_id', userId)
      .order('display_order', { ascending: true, nullsFirst: false }),
    client
      .from('athlete_content')
      .select('id, content_type, media_url, thumbnail_url, caption, overlay_text, views, likes, posted_at, display_order')
      .eq('athlete_id', userId)
      .order('display_order', { ascending: true, nullsFirst: false }),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (academicRes.error) throw new Error(academicRes.error.message);
  if (achievementsRes.error) throw new Error(achievementsRes.error.message);
  if (contentRes.error) throw new Error(contentRes.error.message);

  return {
    hometown: displayHometown(profileRes.data ?? null),
    major: academicRes.data?.major ?? '',
    achievements: ((achievementsRes.data ?? []) as AchievementRow[]).map((row) => ({
      id: row.id,
      title: row.title ?? '',
      year: row.year ? String(row.year) : '',
    })),
    contentItems: ((contentRes.data ?? []) as ContentRow[]).map((row) => ({
      id: row.id,
      type: row.content_type === 'video' ? 'video' : 'image',
      mediaUrl: row.media_url ?? '',
      thumbnailUrl: row.thumbnail_url ?? '',
      caption: row.caption ?? '',
      overlayText: row.overlay_text ?? '',
      views: row.views ? String(row.views) : '',
      likes: row.likes ? String(row.likes) : '',
      postedAt: row.posted_at ?? '',
    })),
  };
}

export async function saveAthleteProfileDetails(details: AthleteProfileDetailsDraft): Promise<void> {
  const client = createClient();
  const userId = await currentUserId();

  const { error: profileError } = await client
    .from('profiles')
    .update({ hometown: details.hometown.trim() })
    .eq('id', userId);
  if (profileError) throw new Error(profileError.message);

  const { error: academicError } = await client
    .from('athlete_academics')
    .upsert(
      { athlete_id: userId, major: details.major.trim() },
      { onConflict: 'athlete_id' },
    );
  if (academicError) throw new Error(academicError.message);

  const cleanAchievements = details.achievements
    .map((item, index) => ({
      athlete_id: userId,
      title: item.title.trim(),
      year: cleanYear(item.year),
      display_order: index,
    }))
    .filter((item) => item.title.length > 0);

  const { error: deleteAchievementsError } = await client
    .from('athlete_achievements')
    .delete()
    .eq('athlete_id', userId);
  if (deleteAchievementsError) throw new Error(deleteAchievementsError.message);

  if (cleanAchievements.length > 0) {
    const { error } = await client.from('athlete_achievements').insert(cleanAchievements);
    if (error) throw new Error(error.message);
  }

  const cleanContent = details.contentItems
    .map((item, index) => {
      const mediaUrl = item.mediaUrl.trim();
      const thumbnailUrl = item.thumbnailUrl.trim();
      return {
        athlete_id: userId,
        content_type: item.type,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl || mediaUrl,
        caption: item.caption.trim(),
        overlay_text: item.overlayText.trim(),
        views: cleanInteger(item.views),
        likes: cleanInteger(item.likes),
        posted_at: item.postedAt || null,
        display_order: index,
      };
    })
    .filter((item) => item.media_url.length > 0);

  const { error: deleteContentError } = await client
    .from('athlete_content')
    .delete()
    .eq('athlete_id', userId);
  if (deleteContentError) throw new Error(deleteContentError.message);

  if (cleanContent.length > 0) {
    const { error } = await client.from('athlete_content').insert(cleanContent);
    if (error) throw new Error(error.message);
  }
}
