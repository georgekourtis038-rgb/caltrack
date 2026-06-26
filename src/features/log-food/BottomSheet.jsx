import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Mobile bottom sheet with a backdrop and a smooth slide-up / slide-down.
 * Stays mounted through the exit animation, then unmounts.
 */
export default function BottomSheet({ open, onClose, children }) {
  const [render, setRender] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setRender(true)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = setTimeout(() => setRender(false), 300)
    return () => clearTimeout(t)
  }, [open])

  // Lock background scroll while the sheet is mounted.
  useEffect(() => {
    if (!render) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [render])

  if (!render) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-surface-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ring-1 ring-white/10 transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="sticky top-0 flex justify-center bg-surface-2 pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
