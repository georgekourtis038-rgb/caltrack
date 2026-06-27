import { supabase } from '../../lib/supabase.js'
import { todayISO } from '../../lib/dates.js'
import { recomputeGamification } from '../log-food/logFood.js'

/**
 * Record a weight entry, then recompute score. The recompute awards a bonus
 * for moving toward the goal weight, so the bonus is derived (not double-counted
 * if the entry is later changed). Returns { bonusXp } for the celebration.
 */
export async function logWeight(userId, weight) {
  const { data: g } = await supabase
    .from('gamification')
    .select('total_xp')
    .eq('user_id', userId)
    .single()
  const before = g?.total_xp ?? 0

  const { error } = await supabase
    .from('weight_logs')
    .insert({ user_id: userId, weight, logged_date: todayISO() })
  if (error) throw error

  const after = await recomputeGamification(userId)
  return { bonusXp: Math.max(0, after - before) }
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
