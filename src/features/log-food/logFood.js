import { supabase } from '../../lib/supabase.js'
import { evaluateBadges } from '../badges/badges.js'

const XP_PER_MEAL = 10

// Local (not UTC) YYYY-MM-DD.
export function todayLocalISO(d = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

// The calendar day before a given YYYY-MM-DD (noon avoids DST edges).
function previousDayISO(iso) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Default meal type based on the time of day.
export function mealTypeForNow(d = new Date()) {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 18) return 'snack'
  return 'dinner'
}

// 100 XP per level → level 1 at 0–99 XP, level 2 at 100–199, etc.
export const levelForXp = (xp) => Math.floor(xp / 100) + 1

/**
 * Insert a food entry for today, then award XP and update streak/level.
 * `entry`: { food_name, meal_type, calories, protein, carbs, fat, serving_size? }
 */
export async function logFoodEntry(userId, entry) {
  const today = todayLocalISO()

  const { error: insertError } = await supabase.from('food_logs').insert({
    user_id: userId,
    logged_date: today,
    meal_type: entry.meal_type,
    food_name: entry.food_name,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    serving_size: entry.serving_size ?? null,
  })
  if (insertError) throw insertError

  await awardXp(userId, today)

  // Badges are a nice-to-have side effect — never let them block a log.
  try {
    await evaluateBadges(userId)
  } catch (e) {
    console.error('Badge evaluation failed:', e)
  }
}

async function awardXp(userId, today) {
  const { data: g, error } = await supabase
    .from('gamification')
    .select('total_xp, weekly_xp, current_streak, longest_streak, last_logged_date')
    .eq('user_id', userId)
    .single()
  if (error) throw error

  // Streak: only changes on a new calendar day. Consecutive day → +1,
  // otherwise (gap, or first ever log) the streak restarts at 1.
  let streak = g.current_streak
  if (g.last_logged_date !== today) {
    streak = g.last_logged_date === previousDayISO(today) ? g.current_streak + 1 : 1
  }

  const total_xp = g.total_xp + XP_PER_MEAL

  const { error: updateError } = await supabase
    .from('gamification')
    .update({
      total_xp,
      weekly_xp: g.weekly_xp + XP_PER_MEAL,
      current_streak: streak,
      longest_streak: Math.max(g.longest_streak, streak),
      last_logged_date: today,
      level: levelForXp(total_xp),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  if (updateError) throw updateError
}
