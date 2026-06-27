import { Link } from 'react-router-dom'

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '🥗' },
  { key: 'dinner', label: 'Dinner', icon: '🍽️' },
  { key: 'snack', label: 'Snacks', icon: '🍎' },
  { key: 'other', label: 'Other', icon: '🍴' },
]

/**
 * Today's food entries grouped by meal type. Hides empty groups.
 */
export default function MealLog({ logs, onSelect }) {
  if (!logs.length) {
    return (
      <Link
        to="/log"
        className="block rounded-2xl border border-dashed border-white/15 bg-surface-2/50 p-8 text-center"
      >
        <p className="text-sm font-medium text-muted">No meals logged yet</p>
        <p className="mt-1 text-xs text-faint">Tap to add your first meal of the day</p>
      </Link>
    )
  }

  const groups = MEALS.map((meal) => ({
    ...meal,
    items: logs.filter((l) => (l.meal_type ?? 'other') === meal.key),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const subtotal = group.items.reduce((sum, i) => sum + (i.calories ?? 0), 0)
        return (
          <div key={group.key}>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-ink">
                <span className="mr-1.5">{group.icon}</span>
                {group.label}
              </h3>
              <span className="text-xs text-faint">
                {Math.round(subtotal).toLocaleString()} cal
              </span>
            </div>
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect?.(item)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.food_name}</p>
                      {item.serving_size && (
                        <p className="truncate text-xs text-faint">{item.serving_size}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-muted">
                      {Math.round(item.calories ?? 0)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
