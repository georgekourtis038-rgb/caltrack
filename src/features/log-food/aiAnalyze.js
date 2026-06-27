// Client helpers for the Claude food-analysis endpoint.

async function postAnalyze(body) {
  const res = await fetch('/api/food-analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Analysis failed')
  return data
}

export function analyzeText(text) {
  return postAnalyze({ mode: 'text', text })
}

export async function analyzeImageFile(file, caption = '') {
  const { base64, mediaType } = await resizeImageToBase64(file)
  return postAnalyze({ mode: 'image', image: base64, mediaType, text: caption })
}

// Downscale + re-encode to JPEG to keep the upload small and fast.
function resizeImageToBase64(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width >= height && width > max) {
        height = Math.round((height * max) / width)
        width = max
      } else if (height > max) {
        width = Math.round((width * max) / height)
        height = max
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
    }
    img.onerror = () => reject(new Error('Could not read image'))
    img.src = url
  })
}
