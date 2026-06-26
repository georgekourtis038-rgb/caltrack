/**
 * Gamification strip: level badge, total XP, and day streak.
 */
export default function StatsStrip({ level, xp, streak }) {
  return (
    <div className="grid grid-cols-3 gap-3">
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
        icon={<span className="text-lg">🔥</span>}
        value={streak}
        label={streak === 1 ? 'day streak' : 'day streak'}
        accent={streak > 0}
      />
    </div>
  )
}

function Stat({ icon, value, label, accent }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-2 px-2 py-3 text-center ring-1 ring-white/5">
      {icon}
      <span className={`text-base font-bold ${accent ? 'text-brand' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  )
}
