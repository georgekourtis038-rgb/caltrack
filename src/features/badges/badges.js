import { supabase } from '../../lib/supabase.js'
import { groupByDay, isGoalHit } from '../../lib/nutrition.js'
import { isoWeekKey } from '../../lib/dates.js'

// Badge catalog (order = display order on the trophy shelf).
export const BADGES = [
  { key: 'first_log', name: 'First Log', icon: '🍽️', condition: 'Log your first meal' },
  { key: 'on_a_roll', name: 'On a Roll', icon: '🔥', condition: 'Reach a 3-day streak' },
  { key: 'week_warrior', name: 'Week Warrior', icon: '🗓️', condition: 'Reach a 7-day streak' },
  { key: 'goal_crusher', name: 'Goal Crusher', icon: '🎯', condition: 'Hit your calorie goal 5 times' },
  { key: 'protein_king', name: 'Protein King', icon: '💪', condition: 'Hit 100g+ protein on 3 days' },
  { key: 'early_bird', name: 'Early Bird', icon: '🌅', condition: 'Log breakfast before 9am, 3 times' },
  { key: 'weekend_warrior', name: 'Weekend Warrior', icon: '🏆', condition: 'Log Sat & Sun in one week' },
]

/**
 * Evaluate every badge for a user and insert any newly earned ones.
 * Safe to call after each food log. Returns the keys newly awarded.
 */
export async function evaluateBadges(userId) {
  const [profileRes, gamRes, logsRes, badgeRes] = await Promise.all([
    supabase.from('profiles').select('calorie_goal').eq('id', userId).single(),
    supabase.from('gamification').select('longest_streak').eq('user_id', userId).single(),
    supabase
      .from('food_logs')
      .select('logged_date, meal_type, calories, protein, created_at')
      .eq('user_id', userId),
    supabase.from('badges').select('badge_key').eq('user_id', userId),
  ])

  const logs = logsRes.data || []
  const goal = profileRes.data?.calorie_goal ?? 2000
  const longestStreak = gamRes.data?.longest_streak ?? 0
  const days = groupByDay(logs)

  const goalHitDays = [...days.values()].filter((d) => isGoalHit(d.calories, goal)).length
  const proteinDays = [...days.values()].filter((d) => d.protein >= 100).length

  // Distinct days with a breakfast entry logged before 9am local.
  const earlyDays = new Set()
  for (const l of logs) {
    if (l.meal_type === 'breakfast' && new Date(l.created_at).getHours() < 9) {
      earlyDays.add(l.logged_date)
    }
  }

  // Any single ISO week containing both a Saturday and a Sunday log.
  const weeks = new Map()
  for (const date of days.keys()) {
    const d = new Date(`${date}T12:00:00`)
    const wk = isoWeekKey(d)
    const s = weeks.get(wk) || { sat: false, sun: false }
    if (d.getDay() === 6) s.sat = true
    if (d.getDay() === 0) s.sun = true
    weeks.set(wk, s)
  }
  const weekendDone = [...weeks.values()].some((w) => w.sat && w.sun)

  const checks = {
    first_log: logs.length >= 1,
    on_a_roll: longestStreak >= 3,
    week_warrior: longestStreak >= 7,
    goal_crusher: goalHitDays >= 5,
    protein_king: proteinDays >= 3,
    early_bird: earlyDays.size >= 3,
    weekend_warrior: weekendDone,
  }

  const have = new Set((badgeRes.data || []).map((b) => b.badge_key))
  const toInsert = Object.entries(checks)
    .filter(([key, met]) => met && !have.has(key))
    .map(([key]) => ({ user_id: userId, badge_key: key }))

  if (toInsert.length) {
    await supabase.from('badges').insert(toInsert)
  }
  return toInsert.map((b) => b.badge_key)
}
