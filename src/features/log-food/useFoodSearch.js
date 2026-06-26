import { useEffect, useState } from 'react'
import { normalizeProduct } from './food.js'

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

/**
 * Debounced Open Food Facts search. Cancels in-flight requests when the
 * query changes. Only searches once the query is at least 2 chars.
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
        const url = new URL(SEARCH_URL)
        url.search = new URLSearchParams({
          search_terms: q,
          search_simple: '1',
          action: 'process',
          json: '1',
          page_size: '20',
          fields: 'code,product_name,brands,serving_size,nutriments',
        }).toString()

        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        const data = await res.json()

        const results = (data.products || [])
          .map(normalizeProduct)
          .filter((p) => p.name && p.per100g.calories != null)

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
