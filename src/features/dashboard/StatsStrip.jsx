import { motion } from 'framer-motion'

/**
 * Gamification strip: level badge, total XP, and day streak.
 */
export default function StatsStrip({ level, xp, streak }) {
  return (
    <motion.div
      className="grid grid-cols-3 gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Stat
        icon={
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-xs font-bold text-surface">
            {level}
          </span>
        }
        value={`Level ${level}`}
        label="Keep going"
      />
      <Stat icon={<span className="text-lg">⚡</span>} value={xp.toLocaleString()} label="Total XP" />
      <Stat
        icon={
          <motion.span
            className="text-lg"
            animate={streak > 0 ? { scale: [1, 1.18, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          >
            🔥
          </motion.span>
        }
        value={streak}
        label="day streak"
        accent={streak > 0}
      />
    </motion.div>
  )
}

function Stat({ icon, value, label, accent }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-2 px-2 py-3 text-center ring-1 ring-white/5">
      {icon}
      <span className={`tnum font-display text-base font-bold ${accent ? 'text-brand' : 'text-white'}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-faint">{label}</span>
    </div>
  )
}
