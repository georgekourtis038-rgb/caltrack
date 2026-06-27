import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedBlob } from './cropUtils.js'

const MIN_ZOOM = 0.6 // allow zooming out a little to include the whole photo
const MAX_ZOOM = 3

/**
 * Full-screen circular avatar cropper. Drag to pan, pinch or use the slider to
 * zoom in/out. Confirm produces a 512px square JPEG blob via onConfirm(blob).
 * `color` fills any area left empty when zoomed out.
 */
export default function AvatarCropper({ file, color = '#14161d', onCancel, onConfirm }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixels, setPixels] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_area, areaPixels) => setPixels(areaPixels), [])

  async function confirm() {
    if (!pixels) return
    setBusy(true)
    setError(null)
    try {
      const blob = await getCroppedBlob(imageSrc, pixels, 512, color)
      await onConfirm(blob)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-surface pt-safe pb-safe">
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onCancel} disabled={busy} className="text-sm font-semibold text-muted">
          Cancel
        </button>
        <h2 className="text-sm font-semibold text-white">Adjust photo</h2>
        <button onClick={confirm} disabled={busy || !pixels} className="text-sm font-bold text-brand disabled:opacity-40">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="relative flex-1">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            restrictPosition={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        )}
      </div>

      <div className="px-6 pb-6 pt-4">
        {error && <p className="mb-2 text-center text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <span className="text-lg text-muted">−</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-brand"
          />
          <span className="text-lg text-muted">+</span>
        </div>
        <p className="mt-3 text-center text-xs text-faint">Drag to reposition · pinch or slide to zoom</p>
      </div>
    </div>
  )
}
