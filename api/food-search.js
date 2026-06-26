// Vercel serverless function: proxies USDA FoodData Central search server-side.
// Free, fast, reliable. Requires USDA_API_KEY in the environment.
//
// GET /api/food-search?q=chicken
//   -> { products: [{ fdcId, food_name, brand, calories, protein, carbs, fat, serving_size }] }
//
// Nutrition values are per 100 g (USDA's standard basis).

const USDA_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

export const config = { maxDuration: 15 }

// USDA nutrient numbers.
const NUTRIENT = { calories: '1008', protein: '1003', fat: '1004', carbs: '1005' }

function nutrientValue(food, number) {
  const n = (food.foodNutrients || []).find((x) => x.nutrientNumber === number)
  return n && typeof n.value === 'number' ? n.value : null
}

function servingText(food) {
  if (food.servingSize) {
    return `${food.servingSize} ${food.servingSizeUnit || ''}`.trim()
  }
  return food.householdServingFullText || null
}

function mapFood(food) {
  return {
    fdcId: food.fdcId,
    food_name: (food.description || '').trim(),
    brand: (food.brandOwner || food.brandName || '').trim(),
    calories: nutrientValue(food, NUTRIENT.calories),
    protein: nutrientValue(food, NUTRIENT.protein),
    carbs: nutrientValue(food, NUTRIENT.carbs),
    fat: nutrientValue(food, NUTRIENT.fat),
    serving_size: servingText(food),
  }
}

export default async function handler(req, res) {
  const q = (req.query.q || '').toString().trim()
  if (q.length < 2) {
    return res.status(200).json({ products: [] })
  }

  const apiKey = process.env.USDA_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'USDA_API_KEY is not configured', products: [] })
  }

  const url = new URL(USDA_URL)
  url.search = new URLSearchParams({
    query: q,
    pageSize: '20',
    api_key: apiKey,
  }).toString()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const usdaRes = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!usdaRes.ok) {
      return res.status(502).json({ error: `Upstream error (${usdaRes.status})`, products: [] })
    }

    const data = await usdaRes.json()
    const products = (data.foods || []).map(mapFood)

    // Cache identical queries briefly at the edge.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({ products })
  } catch (err) {
    const aborted = err.name === 'AbortError'
    return res
      .status(aborted ? 504 : 500)
      .json({ error: aborted ? 'Search timed out' : 'Search failed', products: [] })
  } finally {
    clearTimeout(timeout)
  }
}
