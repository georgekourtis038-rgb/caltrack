import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import MealTypePicker from './MealTypePicker.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { logFoodEntry, mealTypeForNow } from './logFood.js'

const r0 = (n) => Math.round(n || 0)
const r1 = (n) => Math.round((n || 0) * 10) / 10

/**
 * Bottom sheet showing a searched food's nutrition with a serving-basis
 * selector, quantity stepper, and meal picker. Confirm saves to food_logs.
 *
 * `food` is the normalized food (null when closed). We retain the last
 * non-null food so content stays visible during the slide-down.
 */
export default function FoodDetailSheet({ food, onClose, onLogged }) {
  const { user } = useAuth()
  const [shown, setShown] = useState(food)
  const [basis, setBasis] = useState('100g') // 'serving' | '100g'
  const [qty, setQty] = useState(1)
  const [meal, setMeal] = useState(mealTypeForNow())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Reset the form each time a new food opens the sheet.
  useEffect(() => {
    if (!food) return
    setShown(food)
    setBasis(food.perServing ? 'serving' : '100g')
    setQty(1)
    setMeal(mealTypeForNow())
    setSaving(false)
    setError(null)
  }, [food])

  const open = !!food
  const f = shown

  if (!f) return <BottomSheet open={open} onClose={onClose} />

  const base = basis === 'serving' && f.perServing ? f.perServing : f.per100g
  const totals = {
    calories: r0((base.calories || 0) * qty),
    protein: r1((base.protein || 0) * qty),
    carbs: r1((base.carbs || 0) * qty),
    fat: r1((base.fat || 0) * qty),
  }
  const unitLabel =
    basis === 'serving' ? (f.servingSize ? `serving (${f.servingSize})` : 'serving') : '100 g'

  async function confirm() {
    setSaving(true)
    setError(null)
    try {
      await logFoodEntry(user.id, {
        food_name: f.name,
        meal_type: meal,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        serving_size: `${qty} × ${unitLabel}`,
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
        <h2 className="text-lg font-bold leading-tight text-white">{f.name}</h2>
        {f.brand && <p className="text-sm text-slate-400">{f.brand}</p>}

        {/* Nutrition summary */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Nutrient label="Cal" value={totals.calories} accent />
          <Nutrient label="Protein" value={`${totals.protein}g`} />
          <Nutrient label="Carbs" value={`${totals.carbs}g`} />
          <Nutrient label="Fat" value={`${totals.fat}g`} />
        </div>

        {/* Serving basis */}
        <p className="mt-5 mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          Serving
        </p>
        <div className="grid grid-cols-2 gap-2">
          <BasisButton active={basis === 'serving'} disabled={!f.perServing} onClick={() => setBasis('serving')}>
            Per serving{f.servingSize ? ` · ${f.servingSize}` : ''}
          </BasisButton>
          <BasisButton active={basis === '100g'} onClick={() => setBasis('100g')}>
            Per 100 g
          </BasisButton>
        </div>

        {/* Quantity */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
          <span className="text-sm text-slate-300">Quantity</span>
          <div className="flex items-center gap-4">
            <Stepper label="−" onClick={() => setQty((q) => Math.max(0.5, r1(q - 0.5)))} />
            <span className="w-10 text-center text-base font-semibold text-white">{qty}</span>
            <Stepper label="+" onClick={() => setQty((q) => r1(q + 0.5))} />
          </div>
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

function BasisButton({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
        active ? 'bg-brand text-surface' : 'bg-white/5 text-slate-300 active:bg-white/10'
      } disabled:opacity-30`}
    >
      {children}
    </button>
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
