// Aggregation helpers shared across Dashboard, Progress, Battle, and badges.

/** Group food_logs rows into a Map keyed by logged_date with summed macros. */
export function groupByDay(logs) {
  const map = new Map()
  for (const l of logs || []) {
    const cur = map.get(l.logged_date) || {
      date: l.logged_date,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
    cur.calories += Number(l.calories) || 0
    cur.protein += Number(l.protein) || 0
    cur.carbs += Number(l.carbs) || 0
    cur.fat += Number(l.fat) || 0
    map.set(l.logged_date, cur)
  }
  return map
}

/** A day "hits goal" when its calories land within ±10% of the target. */
export function isGoalHit(dayCalories, goal) {
  if (!goal) return false
  return dayCalories >= goal * 0.9 && dayCalories <= goal * 1.1
}

/**
 * A day's adherence score (0..100) — must match the SQL recompute_gamification
 * formula. 0 if nothing logged; otherwise 20 (floor) → 100 (exactly at goal).
 */
export function dayAdherenceXp(calories, goal) {
  if (!calories || calories <= 0 || !goal || goal <= 0) return 0
  const deviation = Math.abs(calories / goal - 1)
  const adherence = Math.min(1, Math.max(0, 1 - deviation / 0.5))
  return Math.round(20 + 80 * adherence)
}

/** Count of days (within the supplied logs) that hit the calorie goal. */
export function goalsHitCount(logs, goal) {
  let n = 0
  for (const day of groupByDay(logs).values()) {
    if (isGoalHit(day.calories, goal)) n++
  }
  return n
}
