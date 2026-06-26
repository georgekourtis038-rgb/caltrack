import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useFoodSearch } from './useFoodSearch.js'
import { useRecentFoods } from './useRecentFoods.js'
import { caloriesLabel } from './food.js'
import { logFoodEntry, mealTypeForNow } from './logFood.js'
import FoodDetailSheet from './FoodDetailSheet.jsx'
import ManualEntrySheet from './ManualEntrySheet.jsx'

export default function LogFood() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const { results, loading, error } = useFoodSearch(query)
  const recents = useRecentFoods(user?.id)

  const [selected, setSelected] = useState(null) // normalized food → detail sheet
  const [manualOpen, setManualOpen] = useState(false)
  const [quickKey, setQuickKey] = useState(null) // chip currently re-logging
  const [quickError, setQuickError] = useState(null)

  function handleLogged() {
    setSelected(null)
    setManualOpen(false)
    navigate('/dashboard')
  }

  async function quickLog(recent) {
    setQuickError(null)
    setQuickKey(recent.key)
    try {
      await logFoodEntry(user.id, {
        food_name: recent.food_name,
        meal_type: mealTypeForNow(),
        calories: recent.calories,
        protein: recent.protein,
        carbs: recent.carbs,
        fat: recent.fat,
        serving_size: recent.serving_size,
      })
      navigate('/dashboard')
    } catch (e) {
      setQuickError(e.message)
      setQuickKey(null)
    }
  }

  const q = query.trim()

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Log Food" subtitle="Search, re-log, or add your own" />

      {/* Quick add recents */}
      {recents.length > 0 && (
        <section className="px-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Quick add
          </p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {recents.map((r) => (
              <button
                key={r.key}
                onClick={() => quickLog(r)}
                disabled={quickKey != null}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition-colors active:bg-white/5 disabled:opacity-50"
              >
                <span className="max-w-[10rem] truncate">{r.food_name}</span>
                <span className="text-xs text-slate-500">
                  {quickKey === r.key ? '…' : `${Math.round(r.calories ?? 0)}`}
                </span>
              </button>
            ))}
          </div>
          {quickError && <p className="mt-1 text-xs text-pink-300">{quickError}</p>}
        </section>
      )}

      {/* Search */}
      <section className="mt-4 px-5">
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods…"
          className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
        />
        <button
          onClick={() => setManualOpen(true)}
          className="mt-3 w-full rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-white/10 active:bg-white/5"
        >
          ✏️ Add manually
        </button>
      </section>

      {/* Results / states */}
      <section className="mt-4 px-5">
        {loading && <ResultsSkeleton />}

        {!loading && error && (
          <p className="rounded-xl bg-pink-500/10 p-4 text-center text-sm text-pink-300">
            {error}
          </p>
        )}

        {!loading && !error && q.length >= 2 && results.length === 0 && (
          <div className="rounded-xl bg-surface-2 p-6 text-center ring-1 ring-white/5">
            <p className="text-sm text-slate-400">No matches for “{q}”.</p>
            <button onClick={() => setManualOpen(true)} className="mt-2 text-sm font-semibold text-brand">
              Add it manually
            </button>
          </div>
        )}

        {!loading && !error && q.length < 2 && recents.length === 0 && (
          <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-slate-500 ring-1 ring-white/5">
            Search Open Food Facts to log your first meal.
          </p>
        )}

        {!loading && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((food) => (
              <li key={food.code}>
                <button
                  onClick={() => setSelected(food)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 text-left ring-1 ring-white/5 transition-colors active:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{food.name}</p>
                    {food.brand && <p className="truncate text-xs text-slate-500">{food.brand}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-300">
                    {caloriesLabel(food)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FoodDetailSheet food={selected} onClose={() => setSelected(null)} onLogged={handleLogged} />
      <ManualEntrySheet open={manualOpen} onClose={() => setManualOpen(false)} onLogged={handleLogged} />
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
      ))}
    </ul>
  )
}
