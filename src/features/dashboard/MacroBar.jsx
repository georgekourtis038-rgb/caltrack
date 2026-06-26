import { useEffect, useState } from 'react'

const COLORS = {
  protein: 'bg-sky-400',
  carbs: 'bg-amber-400',
  fat: 'bg-pink-400',
}

/**
 * One horizontal macro progress bar (protein / carbs / fat).
 * `consumed` and `goal` are in grams.
 */
export default function MacroBar({ label, kind, consumed, goal }) {
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0
  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimPct(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <span className="text-xs text-slate-500">
          {Math.round(consumed)}
          <span className="text-slate-600"> / {Math.round(goal)}g</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${COLORS[kind] ?? 'bg-brand'}`}
          style={{
            width: `${animPct}%`,
            transition: 'width 800ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
    </div>
  )
}
