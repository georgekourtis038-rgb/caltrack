// Vercel serverless function: proxies Open Food Facts search server-side
// so the browser never calls the OFF API directly (avoids CORS).
//
// GET /api/food-search?q=chicken  ->  { products: [...] }

const OFF_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

export default async function handler(req, res) {
  const q = (req.query.q || '').toString().trim()

  if (q.length < 2) {
    return res.status(200).json({ products: [] })
  }

  const url = new URL(OFF_URL)
  url.search = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields: 'code,product_name,brands,serving_size,nutriments',
  }).toString()

  // Don't let a slow upstream hang the function.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const offRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        // OFF asks API clients to identify themselves.
        'User-Agent': 'CalTrack/1.0 (https://github.com/georgekourtis038-rgb/caltrack)',
        Accept: 'application/json',
      },
    })

    if (!offRes.ok) {
      return res.status(502).json({ error: `Upstream error (${offRes.status})`, products: [] })
    }

    const data = await offRes.json()

    // Cache identical queries briefly at the edge to ease load on OFF.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({ products: data.products || [] })
  } catch (err) {
    const aborted = err.name === 'AbortError'
    return res
      .status(aborted ? 504 : 500)
      .json({ error: aborted ? 'Search timed out' : 'Search failed', products: [] })
  } finally {
    clearTimeout(timeout)
  }
}
