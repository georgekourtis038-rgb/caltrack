import { supabase } from '../../lib/supabase.js'

/**
 * Resize + center-crop an image file to a square JPEG, upload it to the user's
 * folder in the public `avatars` bucket, and save the public URL on the profile.
 * Returns the new avatar URL.
 */
export async function uploadAvatar(userId, file) {
  const blob = await resizeToSquareJpeg(file, 512)
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

  return url
}

/** Clear the profile photo (reverts the avatar to the color + initial). */
export async function removeAvatar(userId) {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw error
}

function resizeToSquareJpeg(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      // Cover-crop: scale so the shorter side fills, center the longer side.
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))),
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => reject(new Error('Could not read image'))
    img.src = objUrl
  })
}
