import { useEffect, useState } from 'react'

/**
 * Animated circular progress ring with a gradient stroke and soft glow.
 * Fills from the top, clockwise. Center shows calories remaining.
 */
export default function CalorieRing({ consumed, goal }) {
  const size = 240
  const stroke = 18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const over = consumed > goal
  const remaining = goal - consumed

  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimPct(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  const offset = circumference * (1 - animPct)

  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '78vw' }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ringFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f2d49b" />
            <stop offset="55%" stopColor="#e3b873" />
            <stop offset="100%" stopColor="#c99a4e" />
          </linearGradient>
          <linearGradient id="ringOver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e27d7d" />
            <stop offset="100%" stopColor="#d98ba6" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-ink/[0.07]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${over ? 'ringOver' : 'ringFill'})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)',
            filter: `drop-shadow(0 0 12px ${over ? 'rgba(226,125,125,0.40)' : 'rgba(227,184,115,0.45)'})`,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {over ? (
          <>
            <span className="font-display tnum text-4xl font-bold text-danger">
              {Math.abs(Math.round(remaining)).toLocaleString()}
            </span>
            <span className="mt-1 text-xs font-medium uppercase tracking-widest text-danger/80">over</span>
          </>
        ) : (
          <>
            <span className="font-display tnum text-5xl font-bold text-ink">
              {Math.round(remaining).toLocaleString()}
            </span>
            <span className="mt-1 text-xs font-medium uppercase tracking-widest text-muted">cal left</span>
          </>
        )}
        <span className="tnum mt-2 text-sm text-faint">
          {Math.round(consumed).toLocaleString()} / {goal.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
