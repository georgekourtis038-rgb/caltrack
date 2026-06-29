import { useEffect, useState } from 'react'
import BottomSheet from '../log-food/BottomSheet.jsx'
import { supabase } from '../../lib/supabase.js'
import { dayAdherenceXp } from '../../lib/nutrition.js'

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', other: 'Other' }

/**
 * Read-only view of both partners' meals for a single day, with that day's
 * scores and winner. `day` is { iso, ... } or null when closed.
 */
export default function DayDetailSheet({ day, me, partner, goals, colors, onClose }) {
  const [shown, setShown] = useState(day)
  const [loading, setLoading] = useState(false)
  const [mine, setMine] = useState([])
  const [theirs, setTheirs] = useState([])

  useEffect(() => {
    if (!day) return
    setShown(day)
    setLoading(true)
    let active = true
    const cols = 'id, food_name, meal_type, calories, serving_size, created_at'
    Promise.all([
      supabase.from('food_logs').select(cols).eq('user_id', me.id).eq('logged_date', day.iso).order('created_at'),
      supabase.from('food_logs').select(cols).eq('user_id', partner.id).eq('logged_date', day.iso).order('created_at'),
    ]).then(([a, b]) => {
      if (!active) return
      setMine(a.data || [])
      setTheirs(b.data || [])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [day, me?.id, partner?.id])

  const open = !!day
  const d = shown
  if (!d) return <BottomSheet open={open} onClose={onClose} />

  const myCal = mine.reduce((t, l) => t + (Number(l.calories) || 0), 0)
  const theirCal = theirs.reduce((t, l) => t + (Number(l.calories) || 0), 0)
  const myScore = dayAdherenceXp(myCal, goals.myGoal)
  const theirScore = dayAdherenceXp(theirCal, goals.theirGoal)

  const dateLabel = new Date(`${d.iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  let verdict = 'No logs yet'
  if (myScore || theirScore) {
    verdict = myScore === theirScore ? 'A tie' : myScore > theirScore ? 'You won the day' : `${partner.display_name || 'Partner'} won the day`
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pb-2">
        <h2 className="font-display text-xl font-bold text-ink">{dateLabel}</h2>
        <p className="text-sm font-semibold text-muted">{verdict}</p>

        {/* Score bar */}
        <div className="mt-4 flex items-center gap-3">
          <span className="tnum w-8 text-right text-lg font-bold" style={{ color: colors.myColor }}>{myScore}</span>
          <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div style={{ width: `${share(myScore, theirScore)}%`, backgroundColor: colors.myColor }} />
            <div style={{ width: `${100 - share(myScore, theirScore)}%`, backgroundColor: colors.theirColor }} />
          </div>
          <span className="tnum w-8 text-lg font-bold" style={{ color: colors.theirColor }}>{theirScore}</span>
        </div>

        {loading ? (
          <div className="mt-5 space-y-2">
            <div className="h-16 animate-pulse rounded-xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-xl bg-white/5" />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <PersonMeals name="You" color={colors.myColor} logs={mine} cal={myCal} />
            <PersonMeals name={partner.display_name || 'Partner'} color={colors.theirColor} logs={theirs} cal={theirCal} />
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

const share = (a, b) => (a + b > 0 ? (a / (a + b)) * 100 : 50)

function PersonMeals({ name, color, logs, cal }) {
  const groups = MEAL_ORDER.map((key) => ({
    key,
    items: logs.filter((l) => (l.meal_type ?? 'other') === key),
  })).filter((g) => g.items.length)

  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {name}
        </span>
        <span className="tnum text-sm text-muted">{Math.round(cal).toLocaleString()} cal</span>
      </div>

      {logs.length === 0 ? (
        <p className="py-2 text-center text-xs text-faint">Nothing logged</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">{MEAL_LABEL[g.key]}</p>
              <ul className="space-y-1.5">
                {g.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{item.food_name}</p>
                      {item.serving_size && <p className="truncate text-[11px] text-faint">{item.serving_size}</p>}
                    </div>
                    <span className="tnum shrink-0 text-sm font-medium text-muted">{Math.round(item.calories ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
