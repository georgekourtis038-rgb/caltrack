import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../auth/AuthContext.jsx'

// Local (not UTC) YYYY-MM-DD so "today" matches the user's clock.
export function todayLocalISO() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

/**
 * Fetches everything the Dashboard needs for a given day (defaults to today):
 * the user's profile (goals), global gamification stats, and that day's logs.
 */
export function useDashboardData(dateISO) {
  const { user } = useAuth()
  const day = dateISO || todayLocalISO()
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    loading: true,
    error: null,
    profile: null,
    gamification: null,
    logs: [],
  })

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!user) return
    let active = true
    // Show the skeleton again when switching to a different day.
    setState((s) => ({ ...s, loading: true }))

    async function load() {
      const [profileRes, gamRes, logsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, calorie_goal, protein_goal, carbs_goal, fat_goal')
          .eq('id', user.id)
          .single(),
        supabase
          .from('gamification')
          .select('total_xp, weekly_xp, current_streak, longest_streak, level')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('food_logs')
          .select('id, meal_type, food_name, calories, protein, carbs, fat, serving_size')
          .eq('user_id', user.id)
          .eq('logged_date', day)
          .order('created_at', { ascending: true }),
      ])

      if (!active) return

      const error = profileRes.error || gamRes.error || logsRes.error
      setState({
        loading: false,
        error: error ? error.message : null,
        profile: profileRes.data ?? null,
        gamification: gamRes.data ?? null,
        logs: logsRes.data ?? [],
      })
    }

    load()
    return () => {
      active = false
    }
  }, [user, day, reloadKey])

  return { ...state, refresh }
}
