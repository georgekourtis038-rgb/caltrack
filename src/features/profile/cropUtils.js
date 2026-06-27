/**
 * Render a cropped square JPEG from a source image and react-easy-crop's
 * croppedAreaPixels. Uses a destination-rect draw so it's robust to zoom-out
 * (image smaller than the frame) — empty area is filled with `bg`.
 */
export function getCroppedBlob(imageSrc, cropPixels, outputSize = 512, bg = '#14161d') {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, outputSize, outputSize)

      // Map the whole source image into the output so that the crop region
      // fills the canvas. Handles negative offsets / overflow via clipping.
      const dW = (image.width / cropPixels.width) * outputSize
      const dH = (image.height / cropPixels.height) * outputSize
      const dx = (-cropPixels.x / cropPixels.width) * outputSize
      const dy = (-cropPixels.y / cropPixels.height) * outputSize
      ctx.drawImage(image, dx, dy, dW, dH)

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not crop image'))),
        'image/jpeg',
        0.85
      )
    }
    image.onerror = () => reject(new Error('Could not load image'))
    image.src = imageSrc
  })
}
