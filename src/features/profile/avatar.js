import { supabase } from '../../lib/supabase.js'

/**
 * Upload an already-cropped square JPEG blob as the user's avatar, save its URL
 * on the profile, then delete any previous photos so storage never accumulates
 * old images. Returns the new avatar URL.
 */
export async function uploadAvatarBlob(userId, blob) {
  // Unique filename per upload avoids any CDN caching of a stale image.
  const path = `${userId}/${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = data.publicUrl

  const { error: saveError } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId)
  if (saveError) throw saveError

  // Remove every other file in the user's folder (the previous avatar).
  await removeStoredAvatars(userId, path)

  return url
}

/** Clear the profile photo: delete the stored file(s) and null the column. */
export async function removeAvatar(userId) {
  await removeStoredAvatars(userId)
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw error
}

// Delete files in the user's avatar folder, optionally keeping one path.
async function removeStoredAvatars(userId, keepPath = null) {
  const { data: files } = await supabase.storage.from('avatars').list(userId)
  if (!files?.length) return
  const toRemove = files
    .map((f) => `${userId}/${f.name}`)
    .filter((p) => p !== keepPath)
  if (toRemove.length) {
    await supabase.storage.from('avatars').remove(toRemove)
  }
}
