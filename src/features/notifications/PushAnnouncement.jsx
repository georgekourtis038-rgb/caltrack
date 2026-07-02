import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { isPushSupported, notificationPermission } from './push.js'

const SEEN_KEY = 'caltrack:push-announced'

// One-time "new feature" popup announcing meal reminders. Shows on the next app
// load after this ships, but only where Web Push can actually work and only if
// the user hasn't already made a choice (permission still 'default').
export default function PushAnnouncement() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY)) return
    if (!isPushSupported()) return
    if (notificationPermission() !== 'default') return
    // Small delay so it doesn't fight the initial render/splash.
    const t = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    localStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }

  function setUp() {
    localStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
    // Land on Profile and ask it to scroll the Reminders section into view.
    navigate('/profile', { state: { scrollTo: 'notifications' } })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="push-announce-title"
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-surface-2 ring-1 ring-white/10"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center px-6 pt-7 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-3xl ring-1 ring-brand/25">
                🔔
              </span>
              <span className="mt-3 rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                New
              </span>
              <h2 id="push-announce-title" className="mt-2 font-display text-xl font-bold text-ink">
                Meal reminders
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Get a gentle nudge to log your food during the day — but only on days
                you haven't logged anything yet. Turn it on anytime.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 px-4 pb-4">
              <button
                onClick={dismiss}
                className="rounded-xl bg-white/5 py-3 text-sm font-semibold text-muted ring-1 ring-white/10 active:bg-white/10"
              >
                Not now
              </button>
              <button
                onClick={setUp}
                className="rounded-xl bg-brand py-3 text-sm font-semibold text-surface shadow-lg shadow-brand/20 active:bg-brand-dark"
              >
                Set up
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
