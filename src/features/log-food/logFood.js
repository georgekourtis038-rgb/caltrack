import { supabase } from '../../lib/supabase.js'
import { evaluateBadges } from '../badges/badges.js'

// Local (not UTC) YYYY-MM-DD.
export function todayLocalISO(d = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

// Default meal type based on the time of day.
export function mealTypeForNow(d = new Date()) {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 18) return 'snack'
  return 'dinner'
}

async function totalXp(userId) {
  const { data } = await supabase
    .from('gamification')
    .select('total_xp')
    .eq('user_id', userId)
    .single()
  return data?.total_xp ?? 0
}

/**
 * Recompute all gamification XP from source data (food + weight logs vs goal).
 * XP is per-day goal adherence, so it never depends on how many items you log.
 * Returns the new total XP.
 */
export async function recomputeGamification(userId) {
  const { data, error } = await supabase.rpc('recompute_gamification', { uid: userId })
  if (error) throw error
  return data ?? 0
}

/**
 * Insert a food entry for a given day (defaults to today), then recompute score
 * from scratch. Returns { xp, badges } where xp is the change in total XP (>= 0)
 * so the UI can celebrate genuine progress. Logging to a past day is supported
 * (e.g. a forgotten meal) — the derived score/streak recompute handles it.
 */
export async function logFoodEntry(userId, entry, dateISO) {
  const before = await totalXp(userId)

  const { error: insertError } = await supabase.from('food_logs').insert({
    user_id: userId,
    logged_date: dateISO || todayLocalISO(),
    meal_type: entry.meal_type,
    food_name: entry.food_name,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    serving_size: entry.serving_size ?? null,
  })
  if (insertError) throw insertError

  const after = await recomputeGamification(userId)

  let badges = []
  try {
    badges = await evaluateBadges(userId)
  } catch (e) {
    console.error('Badge evaluation failed:', e)
  }

  return { xp: Math.max(0, after - before), badges }
}

/**
 * Delete a food entry and recompute score. Because XP is derived from the
 * remaining logs, removing an entry can only lower the day's XP toward its
 * true value — there is no log/delete exploit.
 */
export async function deleteFoodEntry(userId, logId) {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', userId)
  if (error) throw error

  await recomputeGamification(userId)
}
