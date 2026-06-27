import { useCallback, useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import PageHeader from '../../components/PageHeader.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useCelebrate } from '../celebrate/CelebrationProvider.jsx'
import { supabase } from '../../lib/supabase.js'
import { groupByDay } from '../../lib/nutrition.js'
import { lastNDates } from '../../lib/dates.js'
import { logWeight, isStagnating } from './weightLog.js'
import { kgToLbs, displayWeightToKg, weightUnitLabel } from '../../lib/bodyUnits.js'

const weekday = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })

export default function Progress() {
  const { user } = useAuth()
  const { celebrateXp } = useCelebrate()
  const [loading, setLoading] = useState(true)
  const [goal, setGoal] = useState(2000)
  const [chart, setChart] = useState([])
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 })
  const [streaks, setStreaks] = useState({ current: 0, longest: 0, totalDays: 0 })
  const [weights, setWeights] = useState([])
  const [unitSystem, setUnitSystem] = useState('metric')

  const [weighOpen, setWeighOpen] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const days7 = lastNDates(7)
    const [profileRes, gamRes, weekRes, allRes, weightRes] = await Promise.all([
      supabase.from('profiles').select('calorie_goal, unit_system').eq('id', user.id).single(),
      supabase.from('gamification').select('current_streak, longest_streak').eq('user_id', user.id).single(),
      supabase
        .from('food_logs')
        .select('logged_date, calories, protein, carbs, fat')
        .eq('user_id', user.id)
        .gte('logged_date', days7[0]),
      supabase.from('food_logs').select('logged_date').eq('user_id', user.id),
      supabase
        .from('weight_logs')
        .select('weight, logged_date')
        .eq('user_id', user.id)
        .order('logged_date', { ascending: true }),
    ])

    const calorieGoal = profileRes.data?.calorie_goal ?? 2000
    setGoal(calorieGoal)
    setUnitSystem(profileRes.data?.unit_system || 'metric')

    const byDay = groupByDay(weekRes.data || [])
    setChart(
      days7.map((iso) => {
        const d = byDay.get(iso)
        return { label: weekday(iso), calories: d ? Math.round(d.calories) : 0 }
      })
    )

    let p = 0
    let c = 0
    let f = 0
    for (const d of byDay.values()) {
      p += d.protein
      c += d.carbs
      f += d.fat
    }
    setMacros({ protein: Math.round(p / 7), carbs: Math.round(c / 7), fat: Math.round(f / 7) })

    const distinctDays = new Set((allRes.data || []).map((r) => r.logged_date))
    setStreaks({
      current: gamRes.data?.current_streak ?? 0,
      longest: gamRes.data?.longest_streak ?? 0,
      totalDays: distinctDays.size,
    })

    setWeights(
      (weightRes.data || []).map((w) => ({
        date: w.logged_date,
        label: new Date(`${w.logged_date}T12:00:00`).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        weight: Number(w.weight),
      }))
    )

    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function saveWeight(e) {
    e.preventDefault()
    // Input is in the user's display unit; store canonical kg.
    const kg = displayWeightToKg(weightInput, unitSystem)
    if (!kg || kg <= 0) return
    setSavingWeight(true)
    const { bonusXp } = await logWeight(user.id, kg)
    setWeightInput('')
    setWeighOpen(false)
    setSavingWeight(false)
    if (bonusXp) celebrateXp(bonusXp, 'XP · toward goal!')
    load()
  }

  // Weights are stored in kg; convert to the display unit for the chart only
  // (stagnation logic still runs on the canonical kg values).
  const unitLabel = weightUnitLabel(unitSystem)
  const weightChart = weights.map((w) => ({
    ...w,
    weight: unitSystem === 'imperial' ? Math.round(kgToLbs(w.weight) * 10) / 10 : w.weight,
  }))

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 pt-6">
        <div className="h-48 animate-pulse rounded-2xl bg-white/5" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <PageHeader title="Progress" subtitle="Last 7 days" />

      {isStagnating(weights) && (
        <div className="mb-4 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-400/20">
          👋 Your weight has held steady for 2+ weeks. A small tweak to your goals or intake could
          get things moving again.
        </div>
      )}

      {/* Calorie chart */}
      <section className="rounded-2xl bg-surface-2 p-4 ring-1 ring-white/5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Calories vs goal</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <ReferenceLine y={goal} stroke="#f3c969" strokeDasharray="4 4" />
            <Bar dataKey="calories" fill="#cbfb45" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-1 text-center text-xs text-slate-500">
          Dashed line = goal ({goal.toLocaleString()} kcal)
        </p>
      </section>

      {/* Macro averages */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <MacroAvg label="Protein" value={macros.protein} color="text-protein" />
        <MacroAvg label="Carbs" value={macros.carbs} color="text-carbs" />
        <MacroAvg label="Fat" value={macros.fat} color="text-fat" />
      </section>
      <p className="mt-1 px-1 text-xs text-slate-500">Daily average over the past 7 days</p>

      {/* Streak history */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Current streak" value={`${streaks.current}🔥`} />
        <Stat label="Longest streak" value={streaks.longest} />
        <Stat label="Days logged" value={streaks.totalDays} />
      </section>

      {/* Weight trend */}
      <section className="mt-4 rounded-2xl bg-surface-2 p-4 ring-1 ring-white/5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Weight trend</h2>
          <button
            onClick={() => setWeighOpen((o) => !o)}
            className="rounded-lg bg-brand/15 px-3 py-1.5 text-xs font-semibold text-brand active:bg-brand/25"
          >
            {weighOpen ? 'Cancel' : '+ Log weight'}
          </button>
        </div>

        {weighOpen && (
          <form onSubmit={saveWeight} className="mb-3 flex gap-2">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              autoFocus
              placeholder={`Weight (${unitLabel})`}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 rounded-xl bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={savingWeight}
              className="rounded-xl bg-brand px-4 text-sm font-semibold text-surface active:bg-brand-dark disabled:opacity-60"
            >
              Save
            </button>
          </form>
        )}

        {weights.length >= 2 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightChart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(v) => [`${v} ${unitLabel}`, 'Weight']}
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="weight" stroke="#cbfb45" strokeWidth={2.5} dot={{ r: 3, fill: '#cbfb45' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">
            {weights.length === 1
              ? 'Log one more to see your trend.'
              : 'Log your weight to start tracking a trend.'}
          </p>
        )}
      </section>
    </div>
  )
}

function MacroAvg({ label, value, color }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4 text-center ring-1 ring-white/5">
      <p className={`text-2xl font-bold ${color}`}>{value}g</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4 text-center ring-1 ring-white/5">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  )
}
