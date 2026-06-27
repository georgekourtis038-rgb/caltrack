import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardData } from './useDashboardData.js'
import CalorieRing from './CalorieRing.jsx'
import MacroBar from './MacroBar.jsx'
import StatsStrip from './StatsStrip.jsx'
import MealLog from './MealLog.jsx'
import DashboardSkeleton from './DashboardSkeleton.jsx'
import EditLogSheet from '../log-food/EditLogSheet.jsx'
import { todayISO, addDaysISO, dayLabel } from '../../lib/dates.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const sum = (logs, key) => logs.reduce((t, l) => t + (Number(l[key]) || 0), 0)
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export default function Dashboard() {
  const [params, setParams] = useSearchParams()
  const today = todayISO()

  // Selected day comes from ?date=, clamped to a valid past/today value.
  const param = params.get('date')
  const date = param && ISO_RE.test(param) && param <= today ? param : today
  const isToday = date === today

  const { loading, error, profile, gamification, logs, refresh } = useDashboardData(date)
  const [editing, setEditing] = useState(null)

  function goTo(next) {
    if (next > today) return
    setParams(next === today ? {} : { date: next }, { replace: true })
    setEditing(null)
  }

  const logHref = isToday ? '/log' : `/log?date=${date}`

  // Goals (with sensible macro fallbacks).
  const calorieGoal = profile?.calorie_goal ?? 2000
  const proteinGoal = profile?.protein_goal ?? Math.round((calorieGoal * 0.3) / 4)
  const carbsGoal = profile?.carbs_goal ?? Math.round((calorieGoal * 0.4) / 4)
  const fatGoal = profile?.fat_goal ?? Math.round((calorieGoal * 0.3) / 9)

  const consumed = sum(logs, 'calories')
  const firstName = (profile?.display_name || '').split(/[ @]/)[0] || 'there'

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      {/* Day navigator */}
      <header className="mb-5 flex items-center justify-between gap-2">
        <Chevron dir="left" onClick={() => goTo(addDaysISO(date, -1))} />

        <div className="relative flex-1 text-center">
          <h1 className="font-display text-2xl font-bold leading-tight text-ink">{dayLabel(date)}</h1>
          <p className="text-xs text-muted">
            {isToday
              ? `${greeting()}, ${firstName}`
              : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
          </p>
          {/* Tap the date to jump to any past day */}
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && goTo(e.target.value)}
            aria-label="Jump to date"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>

        <Chevron dir="right" onClick={() => goTo(addDaysISO(date, 1))} disabled={isToday} />
      </header>

      {!isToday && (
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => goTo(today)}
            className="rounded-full bg-brand/15 px-4 py-1.5 text-xs font-semibold text-brand active:bg-brand/25"
          >
            Jump to today
          </button>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton compact />
      ) : error ? (
        <div className="pt-6 text-center">
          <p className="text-sm text-danger">Couldn’t load this day.</p>
          <p className="mt-1 text-xs text-faint">{error}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Gamification (overall standing) */}
            <StatsStrip
              level={gamification?.level ?? 1}
              xp={gamification?.total_xp ?? 0}
              streak={gamification?.current_streak ?? 0}
            />

            {/* Calorie ring */}
            <section className="mt-6">
              <CalorieRing consumed={consumed} goal={calorieGoal} />
            </section>

            {/* Macros */}
            <section className="mt-6 space-y-3 rounded-2xl bg-surface-2 p-4 ring-1 ring-white/5">
              <MacroBar label="Protein" kind="protein" consumed={sum(logs, 'protein')} goal={proteinGoal} />
              <MacroBar label="Carbs" kind="carbs" consumed={sum(logs, 'carbs')} goal={carbsGoal} />
              <MacroBar label="Fat" kind="fat" consumed={sum(logs, 'fat')} goal={fatGoal} />
            </section>

            {/* Meals for the selected day */}
            <section className="mt-6">
              <h2 className="mb-2 px-1 text-sm font-semibold text-muted">
                {isToday ? 'Today’s log' : 'Logged meals'}
              </h2>
              <MealLog logs={logs} onSelect={setEditing} logHref={logHref} />
            </section>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Floating add button — adds to the day you're viewing */}
      <motion.div
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-40"
        whileTap={{ scale: 0.9 }}
      >
        <Link
          to={logHref}
          aria-label={isToday ? 'Log food' : `Log food for ${dayLabel(date)}`}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-surface shadow-lg shadow-brand/30"
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </motion.div>

      <EditLogSheet
        log={editing}
        onClose={() => setEditing(null)}
        onChanged={() => {
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}

function Chevron({ dir, onClick, disabled }) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.88 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Previous day' : 'Next day'}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink ring-1 ring-white/10 transition-opacity active:bg-white/5 disabled:opacity-30"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </motion.button>
  )
}
