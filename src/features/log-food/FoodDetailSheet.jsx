import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import MealTypePicker from './MealTypePicker.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { logFoodEntry, mealTypeForNow } from './logFood.js'

const r0 = (n) => Math.round(n || 0)
const r1 = (n) => Math.round((n || 0) * 10) / 10
const GRAM_PRESETS = [50, 100, 150, 200]

/**
 * Bottom sheet showing a searched food's nutrition (per 100 g from USDA),
 * with a gram-amount selector and meal picker. Confirm saves to food_logs.
 *
 * `food` is the normalized food (null when closed). We retain the last
 * non-null food so content stays visible during the slide-down.
 */
export default function FoodDetailSheet({ food, onClose, onLogged }) {
  const { user } = useAuth()
  const [shown, setShown] = useState(food)
  const [grams, setGrams] = useState(100)
  const [meal, setMeal] = useState(mealTypeForNow())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Reset the form each time a new food opens the sheet.
  useEffect(() => {
    if (!food) return
    setShown(food)
    setGrams(100)
    setMeal(mealTypeForNow())
    setSaving(false)
    setError(null)
  }, [food])

  const open = !!food
  const f = shown

  if (!f) return <BottomSheet open={open} onClose={onClose} />

  const factor = grams / 100
  const totals = {
    calories: r0((f.calories || 0) * factor),
    protein: r1((f.protein || 0) * factor),
    carbs: r1((f.carbs || 0) * factor),
    fat: r1((f.fat || 0) * factor),
  }

  async function confirm() {
    setSaving(true)
    setError(null)
    try {
      await logFoodEntry(user.id, {
        food_name: f.food_name,
        meal_type: meal,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        serving_size: `${grams} g`,
      })
      onLogged()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={saving ? undefined : onClose}>
      <div className="pb-2">
        <h2 className="text-lg font-bold leading-tight text-white">{f.food_name}</h2>
        {f.brand && <p className="text-sm text-slate-400">{f.brand}</p>}
        {f.serving_size && (
          <p className="mt-0.5 text-xs text-slate-500">Label serving: {f.serving_size}</p>
        )}

        {/* Nutrition summary (for the chosen amount) */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Nutrient label="Cal" value={totals.calories} accent />
          <Nutrient label="Protein" value={`${totals.protein}g`} />
          <Nutrient label="Carbs" value={`${totals.carbs}g`} />
          <Nutrient label="Fat" value={`${totals.fat}g`} />
        </div>

        {/* Amount */}
        <p className="mt-5 mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          Amount
        </p>
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
          <span className="text-sm text-slate-300">Grams</span>
          <div className="flex items-center gap-4">
            <Stepper label="−" onClick={() => setGrams((g) => Math.max(10, g - 10))} />
            <span className="w-12 text-center text-base font-semibold text-white">{grams}</span>
            <Stepper label="+" onClick={() => setGrams((g) => g + 10)} />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {GRAM_PRESETS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrams(g)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                grams === g ? 'bg-brand text-surface' : 'bg-white/5 text-slate-300 active:bg-white/10'
              }`}
            >
              {g}g
            </button>
          ))}
        </div>

        {/* Meal type */}
        <p className="mt-5 mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          Meal
        </p>
        <MealTypePicker value={meal} onChange={setMeal} />

        {error && <p className="mt-3 text-sm text-pink-300">{error}</p>}

        <button
          onClick={confirm}
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-surface transition-colors active:bg-brand-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : `Add ${totals.calories} cal · +10 XP`}
        </button>
      </div>
    </BottomSheet>
  )
}

function Nutrient({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-white/5 py-2.5">
      <p className={`text-lg font-bold ${accent ? 'text-brand' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

function Stepper({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white active:bg-white/20"
    >
      {label}
    </button>
  )
}
