import { useEffect, useState } from 'react'

// Our own serverless proxy (api/food-search.js) — calls USDA FoodData Central.
const SEARCH_URL = '/api/food-search'

/**
 * Debounced food search via our serverless proxy. Cancels in-flight
 * requests when the query changes. Only searches once the query is >= 2 chars.
 */
export function useFoodSearch(query) {
  const [state, setState] = useState({ results: [], loading: false, error: null })

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setState({ results: [], loading: false, error: null })
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))
    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const url = new URL(SEARCH_URL, window.location.origin)
        url.searchParams.set('q', q)

        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        const data = await res.json()

        // Proxy already returns normalized foods; keep ones with a name + calories.
        const results = (data.products || []).filter(
          (p) => p.food_name && p.calories != null
        )

        setState({ results, loading: false, error: null })
      } catch (e) {
        if (e.name === 'AbortError') return
        setState({ results: [], loading: false, error: e.message })
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return state
}
