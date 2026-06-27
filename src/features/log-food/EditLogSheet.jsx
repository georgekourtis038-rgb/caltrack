import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import MealTypePicker from './MealTypePicker.jsx'
import { supabase } from '../../lib/supabase.js'
import { parseServingGrams } from '../../lib/units.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { deleteFoodEntry } from './logFood.js'

const r0 = (n) => Math.round(n || 0)
const r1 = (n) => Math.round((n || 0) * 10) / 10

/**
 * Edit or delete an already-logged meal. When the serving is "<n> g" the
 * grams can be changed and macros rescale proportionally; meal type and
 * delete are always available.
 */
export default function EditLogSheet({ log, onClose, onChanged }) {
  const { user } = useAuth()
  const [shown, setShown] = useState(log)
  const [grams, setGrams] = useState('')
  const [meal, setMeal] = useState('snack')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!log) return
    setShown(log)
    setGrams(String(parseServingGrams(log.serving_size) ?? ''))
    setMeal(log.meal_type || 'snack')
    setBusy(false)
    setError(null)
  }, [log])

  const open = !!log
  const l = shown
  if (!l) return <BottomSheet open={open} onClose={onClose} />

  const baseGrams = parseServingGrams(l.serving_size)
  const scalable = baseGrams != null && baseGrams > 0
  const factor = scalable ? (Number(grams) || 0) / baseGrams : 1

  const totals = {
    calories: r0((l.calories || 0) * factor),
    protein: r1((l.protein || 0) * factor),
    carbs: r1((l.carbs || 0) * factor),
    fat: r1((l.fat || 0) * factor),
  }

  async function save() {
    setBusy(true)
    setError(null)
    const patch = { meal_type: meal }
    if (scalable) {
      patch.calories = totals.calories
      patch.protein = totals.protein
      patch.carbs = totals.carbs
      patch.fat = totals.fat
      patch.serving_size = `${grams} g`
    }
    const { error } = await supabase.from('food_logs').update(patch).eq('id', l.id)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    onChanged()
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      // Deletes the row AND refunds the meal's XP (prevents log/delete farming).
      await deleteFoodEntry(user.id, l.id)
      onChanged()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={busy ? undefined : onClose}>
      <div className="pb-2">
        <h2 className="text-lg font-bold text-white">{l.food_name}</h2>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Nutrient label="Cal" value={totals.calories} accent />
          <Nutrient label="Protein" value={`${totals.protein}g`} />
          <Nutrient label="Carbs" value={`${totals.carbs}g`} />
          <Nutrient label="Fat" value={`${totals.fat}g`} />
        </div>

        {scalable ? (
          <>
            <Label>Amount (g)</Label>
            <input
              type="number"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-base text-white outline-none ring-1 ring-white/10 focus:ring-brand"
            />
          </>
        ) : (
          <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">
            This entry has a custom serving, so its grams can't be rescaled. You can still change
            the meal or delete it.
          </p>
        )}

        <Label>Meal</Label>
        <MealTypePicker value={meal} onChange={setMeal} />

        {error && <p className="mt-3 text-sm text-pink-300">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-xl bg-pink-500/15 px-5 py-3.5 text-sm font-semibold text-pink-300 active:bg-pink-500/25 disabled:opacity-60"
          >
            Delete
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-surface active:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

function Label({ children }) {
  return <p className="mt-5 mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">{children}</p>
}

function Nutrient({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-white/5 py-2.5">
      <p className={`text-lg font-bold ${accent ? 'text-brand' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}
