import { useEffect, useState } from 'react'

/**
 * Animated circular progress ring. Fills from the top, clockwise.
 * Center shows calories remaining (or how far over goal).
 */
export default function CalorieRing({ consumed, goal }) {
  const size = 240
  const stroke = 18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const over = consumed > goal
  const remaining = goal - consumed

  // Animate from empty → target whenever the value changes.
  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimPct(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  const offset = circumference * (1 - animPct)

  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '78vw' }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/10"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={over ? 'text-pink-500' : 'text-brand'}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {over ? (
          <>
            <span className="text-4xl font-bold text-pink-400">
              {Math.abs(Math.round(remaining)).toLocaleString()}
            </span>
            <span className="mt-1 text-xs font-medium uppercase tracking-wide text-pink-300/80">
              cal over
            </span>
          </>
        ) : (
          <>
            <span className="text-5xl font-bold text-white">
              {Math.round(remaining).toLocaleString()}
            </span>
            <span className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              cal left
            </span>
          </>
        )}
        <span className="mt-2 text-sm text-slate-500">
          {Math.round(consumed).toLocaleString()} / {goal.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
