import { createClient } from '@/lib/supabase/client';

const BUCKET = 'avatars';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Uploads an image to the `avatars` Supabase Storage bucket under
 * `<userId>/avatar-<timestamp>.<ext>`, then writes the resulting public
 * URL to `profiles.avatar_url` for that user.
 *
 * Returns the public URL on success. Throws on validation failure,
 * auth failure, upload failure, or profile update failure.
 */
export async function uploadAvatar(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be under 5 MB.');
  }

  const supabase = createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new Error('You must be signed in to upload a photo.');
  }

  const userId = userData.user.id;
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

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
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (profileErr) {
    throw new Error(`Uploaded but could not save to profile: ${profileErr.message}`);
  }

  // Cleanup: remove any prior avatars in this user's folder so Storage
  // doesn't accumulate orphans. Non-fatal — the current upload already
  // succeeded; a failed cleanup just leaves extra bytes for next time.
  const currentFilename = path.slice(userId.length + 1);
  const { data: existing } = await supabase.storage.from(BUCKET).list(userId);
  if (existing && existing.length > 0) {
    const stalePaths = existing
      .filter((obj) => obj.name !== currentFilename)
      .map((obj) => `${userId}/${obj.name}`);
    if (stalePaths.length > 0) {
      const { error: removeErr } = await supabase.storage.from(BUCKET).remove(stalePaths);
      if (removeErr) {
        console.warn('[avatarUpload] Could not clean up stale avatars:', removeErr.message);
      }
    }
  }

  return publicUrl;
}
