import { supabase } from '../../lib/supabase.js'
import { todayISO } from '../../lib/dates.js'

const WEIGHT_BONUS_XP = 25

// 100 XP per level (matches logFood.js).
const levelForXp = (xp) => Math.floor(xp / 100) + 1

/**
 * Record a weight entry. If a goal weight is set and the new weight is closer
 * to it than the previous entry, award bonus XP. Returns { bonusXp }.
 */
export async function logWeight(userId, weight) {
  const [{ data: profile }, { data: prev }] = await Promise.all([
    supabase.from('profiles').select('goal_weight').eq('id', userId).single(),
    supabase
      .from('weight_logs')
      .select('weight')
      .eq('user_id', userId)
      .order('logged_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const { error } = await supabase
    .from('weight_logs')
    .insert({ user_id: userId, weight, logged_date: todayISO() })
  if (error) throw error

  // Bonus only when moving toward a set goal (never a penalty for moving away).
  const goal = profile?.goal_weight
  const previous = prev?.weight
  let bonusXp = 0
  if (goal != null && previous != null) {
    const movedToward = Math.abs(weight - goal) < Math.abs(previous - goal)
    if (movedToward) bonusXp = WEIGHT_BONUS_XP
  }

  if (bonusXp) {
    const { data: g } = await supabase
      .from('gamification')
      .select('total_xp, weekly_xp')
      .eq('user_id', userId)
      .single()
    if (g) {
      const total_xp = g.total_xp + bonusXp
      await supabase
        .from('gamification')
        .update({
          total_xp,
          weekly_xp: g.weekly_xp + bonusXp,
          level: levelForXp(total_xp),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }
  }

  return { bonusXp }
}

/**
 * Gentle stagnation check: if there are entries spanning ≥14 days but weight
 * has barely moved, suggest a nudge. Returns true when stagnating.
 */
export function isStagnating(weights) {
  if (!weights || weights.length < 2) return false
  const first = weights[0]
  const last = weights[weights.length - 1]
  const days = (new Date(last.date) - new Date(first.date)) / 86400000
  return days >= 14 && Math.abs(last.weight - first.weight) < 0.5
}
