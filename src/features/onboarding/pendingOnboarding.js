import { supabase } from '../../lib/supabase.js'
import { computeTargets } from '../../lib/targets.js'
import { todayISO } from '../../lib/dates.js'

const KEY = 'caltrack_pending_onboarding'

// Collected onboarding answers are stashed locally at signup, then applied
// once the new session is authenticated — robust against the signup component
// unmounting mid-write.
export function savePendingOnboarding(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* ignore storage failures */
  }
}

function readPending() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function hasPendingOnboarding() {
  try {
    return localStorage.getItem(KEY) != null
  } catch {
    return false
  }
}

function clearPending() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

let inFlight = false

/**
 * If there's pending onboarding data and this account hasn't been onboarded,
 * write the profile, an initial weight log, and computed targets. Guarded so
 * logging into an existing account never clobbers it, and so a double-invoked
 * effect can't insert the initial weight twice.
 */
export async function applyPendingOnboarding(userId) {
  if (inFlight) return false
  const d = readPending()
  if (!d) return false
  inFlight = true
  try {
    return await applyInner(userId, d)
  } finally {
    inFlight = false
  }
}

async function applyInner(userId, d) {

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', userId)
    .single()

  if (profile?.onboarded) {
    clearPending()
    return false
  }

  const targets = computeTargets({
    sex: d.sex,
    age: Number(d.age),
    heightCm: Number(d.height),
    weightKg: Number(d.weight),
    goalType: d.goalType,
  })

  await supabase.from('profiles').upsert({
    id: userId,
    display_name: d.name || undefined,
    age: Number(d.age) || null,
    sex: d.sex || null,
    height_cm: Number(d.height) || null,
    weight_goal_type: d.goalType || null,
    goal_weight: Number(d.goalWeight) || null,
    onboarded: true,
    ...(targets && {
      calorie_goal: targets.calories,
      protein_goal: targets.protein,
      carbs_goal: targets.carbs,
      fat_goal: targets.fat,
    }),
  })

  if (Number(d.weight)) {
    await supabase.from('weight_logs').insert({
      user_id: userId,
      weight: Number(d.weight),
      logged_date: todayISO(),
    })
  }

  clearPending()
  return true
}
