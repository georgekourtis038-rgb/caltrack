import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

/**
 * Last 5 unique foods the user has logged (most recent first),
 * for one-tap re-logging.
 */
export function useRecentFoods(userId) {
  const [recents, setRecents] = useState([])

  useEffect(() => {
    if (!userId) return
    let active = true

    supabase
      .from('food_logs')
      .select('food_name, calories, protein, carbs, fat, serving_size')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => {
        if (!active || !data) return
        const seen = new Set()
        const unique = []
        for (const row of data) {
          if (seen.has(row.food_name)) continue
          seen.add(row.food_name)
          unique.push({ ...row, key: row.food_name })
          if (unique.length >= 5) break
        }
        setRecents(unique)
      })

    return () => {
      active = false
    }
  }, [userId])

  return recents
}
