import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import MealTypePicker from './MealTypePicker.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useCelebrate } from '../celebrate/CelebrationProvider.jsx'
import { logFoodEntry, mealTypeForNow } from './logFood.js'
import { UNITS, toGrams, parseServingGrams } from '../../lib/units.js'

const r0 = (n) => Math.round(n || 0)
const r1 = (n) => Math.round((n || 0) * 10) / 10

/**
 * Detail sheet for a food before logging. Two modes:
 *  - per-100g (USDA): amount + unit selector scales per-100g nutrition.
 *  - portion (AI/manual estimate): a quantity multiplier scales the estimate.
 */
export default function FoodDetailSheet({ food, onClose, onLogged }) {
  const { user } = useAuth()
  const { celebrateXp, celebrateBadges } = useCelebrate()
  const [shown, setShown] = useState(food)
  const [amount, setAmount] = useState('100')
  const [unit, setUnit] = useState('g')
  const [qty, setQty] = useState('1')
  const [meal, setMeal] = useState(mealTypeForNow())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!food) return
    setShown(food)
    setUnit('g')
    setQty('1')
    setMeal(mealTypeForNow())
    setSaving(false)
    setError(null)
    // Default amount: the food's label serving if known, else 100 g.
    const labelGrams = parseServingGrams(food.serving_size)
    setAmount(String(food.kind === 'portion' ? 100 : labelGrams || 100))
  }, [food])

  const open = !!food
  const f = shown
  if (!f) return <BottomSheet open={open} onClose={onClose} />

  const isPortion = f.kind === 'portion'
  const grams = toGrams(amount, unit)
  const factor = isPortion ? Number(qty) || 0 : grams / 100

  const totals = {
    calories: r0((f.calories || 0) * factor),
    protein: r1((f.protein || 0) * factor),
    carbs: r1((f.carbs || 0) * factor),
    fat: r1((f.fat || 0) * factor),
  }

  const labelGrams = parseServingGrams(f.serving_size)
  const servingText = isPortion
    ? f.serving_size
      ? `${qty} × ${f.serving_size}`
      : `${qty} portion`
    : `${amount} ${unit}`

  async function confirm() {
    setSaving(true)
    setError(null)
    try {
      const result = await logFoodEntry(user.id, {
        food_name: f.food_name,
        meal_type: meal,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        serving_size: servingText,
      })
      celebrateXp(result.xp)
      celebrateBadges(result.badges)
      onLogged()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={saving ? undefined : onClose}>
      <div className="pb-2">
        <div className="flex items-center gap-2">
          {isPortion && <span className="rounded-md bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">AI</span>}
          <h2 className="text-lg font-bold leading-tight text-ink">{f.food_name}</h2>
        </div>
        {f.brand && <p className="text-sm text-muted">{f.brand}</p>}
        {f.serving_size && <p className="mt-0.5 text-xs text-faint">Serving: {f.serving_size}</p>}

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Nutrient label="Cal" value={totals.calories} accent />
          <Nutrient label="Protein" value={`${totals.protein}g`} />
          <Nutrient label="Carbs" value={`${totals.carbs}g`} />
          <Nutrient label="Fat" value={`${totals.fat}g`} />
        </div>

        {isPortion ? (
          <>
            <Label>Servings</Label>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
              <span className="text-sm text-muted">Quantity ×</span>
              <input
                type="number"
                step="0.5"
                min="0"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-20 rounded-lg bg-white/5 px-2 py-1.5 text-right text-base text-ink outline-none ring-1 ring-white/10 focus:ring-brand"
              />
            </div>
          </>
        ) : (
          <>
            <Label>Amount</Label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-base text-ink outline-none ring-1 ring-white/10 focus:ring-brand"
              />
              <div className="flex overflow-hidden rounded-xl ring-1 ring-white/10">
                {UNITS.map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => setUnit(u.key)}
                    className={`px-2.5 text-xs font-semibold transition-colors ${
                      unit === u.key ? 'bg-brand text-surface' : 'bg-white/5 text-muted'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {labelGrams && (
                <Chip onClick={() => { setAmount(String(labelGrams)); setUnit('g') }}>
                  Label serving ({labelGrams}g)
                </Chip>
              )}
              {[100, 150, 200].map((g) => (
                <Chip key={g} onClick={() => { setAmount(String(g)); setUnit('g') }}>
                  {g}g
                </Chip>
              ))}
            </div>
          </>
        )}

        <Label>Meal</Label>
        <MealTypePicker value={meal} onChange={setMeal} />

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

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

function Label({ children }) {
  return (
    <p className="mt-5 mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">{children}</p>
  )
}

function Chip({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted active:bg-white/10"
    >
      {children}
    </button>
  )
}

function Nutrient({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-white/5 py-2.5">
      <p className={`text-lg font-bold ${accent ? 'text-brand' : 'text-ink'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-faint">{label}</p>
    </div>
  )
}
