import { Link } from 'react-router-dom'
import { useDashboardData } from './useDashboardData.js'
import CalorieRing from './CalorieRing.jsx'
import MacroBar from './MacroBar.jsx'
import StatsStrip from './StatsStrip.jsx'
import MealLog from './MealLog.jsx'
import DashboardSkeleton from './DashboardSkeleton.jsx'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const sum = (logs, key) => logs.reduce((t, l) => t + (Number(l[key]) || 0), 0)

export default function Dashboard() {
  const { loading, error, profile, gamification, logs } = useDashboardData()

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="mx-auto max-w-md px-5 pt-10 text-center">
        <p className="text-sm text-pink-300">Couldn’t load your dashboard.</p>
        <p className="mt-1 text-xs text-slate-500">{error}</p>
      </div>
    )
  }

  // Goals — fall back to sensible splits of the calorie goal when a macro
  // goal hasn't been set (30% protein / 40% carbs / 30% fat).
  const calorieGoal = profile?.calorie_goal ?? 2000
  const proteinGoal = profile?.protein_goal ?? Math.round((calorieGoal * 0.3) / 4)
  const carbsGoal = profile?.carbs_goal ?? Math.round((calorieGoal * 0.4) / 4)
  const fatGoal = profile?.fat_goal ?? Math.round((calorieGoal * 0.3) / 9)

  // Today's totals from the logs.
  const consumed = sum(logs, 'calories')
  const protein = sum(logs, 'protein')
  const carbs = sum(logs, 'carbs')
  const fat = sum(logs, 'fat')

  const firstName = (profile?.display_name || '').split(/[ @]/)[0] || 'there'

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <header className="mb-4">
        <p className="text-sm text-slate-400">{greeting()},</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">{firstName}</h1>
      </header>

      {/* Gamification */}
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
        <MacroBar label="Protein" kind="protein" consumed={protein} goal={proteinGoal} />
        <MacroBar label="Carbs" kind="carbs" consumed={carbs} goal={carbsGoal} />
        <MacroBar label="Fat" kind="fat" consumed={fat} goal={fatGoal} />
      </section>

      {/* Today's meals */}
      <section className="mt-6">
        <h2 className="mb-2 px-1 text-sm font-semibold text-slate-300">Today’s log</h2>
        <MealLog logs={logs} />
      </section>

      {/* Floating add button */}
      <Link
        to="/log"
        aria-label="Log food"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-surface shadow-lg shadow-brand/30 transition-transform active:scale-95"
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  )
}
