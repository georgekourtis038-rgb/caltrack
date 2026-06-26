const TYPES = [
  ['breakfast', 'Breakfast'],
  ['lunch', 'Lunch'],
  ['dinner', 'Dinner'],
  ['snack', 'Snack'],
]

export default function MealTypePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TYPES.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
            value === key
              ? 'bg-brand text-surface'
              : 'bg-white/5 text-slate-300 active:bg-white/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
