import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { BADGES } from '../badges/badges.js'

const CelebrationContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useCelebrate() {
  const ctx = useContext(CelebrationContext)
  if (!ctx) throw new Error('useCelebrate must be used within CelebrationProvider')
  return ctx
}

function fireConfetti() {
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'] })
}

export function CelebrationProvider({ children }) {
  const [xpToast, setXpToast] = useState(null) // { id, amount, label }
  const [badgeQueue, setBadgeQueue] = useState([]) // badge keys

  const celebrateXp = useCallback((amount, label = 'XP') => {
    if (!amount) return
    setXpToast({ id: Date.now(), amount, label })
  }, [])

  const celebrateBadges = useCallback((keys) => {
    if (keys?.length) {
      setBadgeQueue((q) => [...q, ...keys])
      fireConfetti()
    }
  }, [])

  useEffect(() => {
    if (!xpToast) return
    const t = setTimeout(() => setXpToast(null), 1700)
    return () => clearTimeout(t)
  }, [xpToast])

  const currentBadge = badgeQueue[0]
  const badge = BADGES.find((b) => b.key === currentBadge)
  const dismissBadge = () => setBadgeQueue((q) => q.slice(1))

  return (
    <CelebrationContext.Provider value={{ celebrateXp, celebrateBadges }}>
      {children}

      {/* Floating XP toast */}
      <AnimatePresence>
        {xpToast && (
          <motion.div
            key={xpToast.id}
            initial={{ opacity: 0, y: 24, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="pointer-events-none fixed inset-x-0 top-[18%] z-[60] flex justify-center"
          >
            <div className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-base font-bold text-surface shadow-xl shadow-brand/30">
              <span className="text-lg">⚡</span> +{xpToast.amount} {xpToast.label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge unlock modal */}
      <AnimatePresence>
        {badge && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70" onClick={dismissBadge} />
            <motion.div
              initial={{ scale: 0.6, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative w-full max-w-xs rounded-3xl bg-gradient-to-b from-surface-2 to-surface p-7 text-center ring-1 ring-brand/30"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">Badge unlocked</p>
              <motion.div
                className="my-4 text-6xl"
                initial={{ rotate: -12, scale: 0.7 }}
                animate={{ rotate: [-12, 8, 0], scale: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                {badge.icon}
              </motion.div>
              <h3 className="text-xl font-bold text-white">{badge.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{badge.condition}</p>
              <button
                onClick={dismissBadge}
                className="mt-5 w-full rounded-xl bg-brand px-4 py-3 text-base font-semibold text-surface active:bg-brand-dark"
              >
                Nice!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CelebrationContext.Provider>
  )
}
