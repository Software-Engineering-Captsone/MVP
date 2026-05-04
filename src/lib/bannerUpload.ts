import { createClient } from '@/lib/supabase/client';

const BUCKET = 'banners';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadBanner(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be under 5 MB.');
  }

  const supabase = createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new Error('You must be signed in to upload a banner.');
  }

  const userId = userData.user.id;
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${userId}/banner-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadErr) {
    throw new Error(uploadErr.message);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ banner_url: publicUrl })
    .eq('id', userId);
  if (profileErr) {
    throw new Error(`Uploaded but could not save to profile: ${profileErr.message}`);
  }

  // Non-fatal cleanup of stale banners in this user's folder.
  const currentFilename = path.slice(userId.length + 1);
  const { data: existing } = await supabase.storage.from(BUCKET).list(userId);
  if (existing && existing.length > 0) {
    const stalePaths = existing
      .filter((obj) => obj.name !== currentFilename)
      .map((obj) => `${userId}/${obj.name}`);
    if (stalePaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(stalePaths);
    }
  }

  return publicUrl;
}
