import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import MealTypePicker from './MealTypePicker.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useCelebrate } from '../celebrate/CelebrationProvider.jsx'
import { logFoodEntry, mealTypeForNow } from './logFood.js'

const EMPTY = { name: '', calories: '', protein: '', carbs: '', fat: '' }

/**
 * Manual food entry fallback for foods not found via search.
 */
export default function ManualEntrySheet({ open, date, onClose, onLogged }) {
  const { user } = useAuth()
  const { celebrateXp, celebrateBadges } = useCelebrate()
  const [form, setForm] = useState(EMPTY)
  const [meal, setMeal] = useState(mealTypeForNow())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY)
    setMeal(mealTypeForNow())
    setSaving(false)
    setError(null)
  }, [open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const valid = form.name.trim() && form.calories !== '' && Number(form.calories) >= 0

  async function confirm() {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const result = await logFoodEntry(
        user.id,
        {
          food_name: form.name.trim(),
          meal_type: meal,
          calories: Math.round(Number(form.calories) || 0),
          protein: Number(form.protein) || 0,
          carbs: Number(form.carbs) || 0,
          fat: Number(form.fat) || 0,
          serving_size: null,
        },
        date
      )
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
        <h2 className="text-lg font-bold text-ink">Add manually</h2>
        <p className="text-sm text-muted">Enter the nutrition yourself</p>

        <div className="mt-4 space-y-3">
          <Field
            label="Food name"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Homemade smoothie"
          />
          <Field
            label="Calories"
            value={form.calories}
            onChange={set('calories')}
            type="number"
            inputMode="numeric"
            placeholder="0"
          />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Protein (g)" value={form.protein} onChange={set('protein')} type="number" inputMode="decimal" placeholder="0" />
            <Field label="Carbs (g)" value={form.carbs} onChange={set('carbs')} type="number" inputMode="decimal" placeholder="0" />
            <Field label="Fat (g)" value={form.fat} onChange={set('fat')} type="number" inputMode="decimal" placeholder="0" />
          </div>
        </div>

        <p className="mt-5 mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">Meal</p>
        <MealTypePicker value={meal} onChange={setMeal} />

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <button
          onClick={confirm}
          disabled={!valid || saving}
          className="mt-5 w-full rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-surface transition-colors active:bg-brand-dark disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Add · +10 XP'}
        </button>
      </div>
    </BottomSheet>
  )
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-base text-ink placeholder:text-faint outline-none ring-1 ring-white/10 focus:ring-brand"
      />
    </label>
  )
}
