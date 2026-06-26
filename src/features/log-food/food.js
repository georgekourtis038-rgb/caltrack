// Helpers for turning Open Food Facts products into a clean shape.

const num = (v) => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Normalize a raw OFF product into the shape the UI uses.
 * Exposes per-100g and (when available) per-serving nutrition.
 */
export function normalizeProduct(p) {
  const n = p.nutriments || {}

  const per100g = {
    calories: num(n['energy-kcal_100g']),
    protein: num(n.proteins_100g),
    carbs: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
  }

  const hasServing = num(n['energy-kcal_serving']) != null
  const perServing = hasServing
    ? {
        calories: num(n['energy-kcal_serving']),
        protein: num(n.proteins_serving),
        carbs: num(n.carbohydrates_serving),
        fat: num(n.fat_serving),
      }
    : null

  return {
    code: p.code,
    name: (p.product_name || '').trim(),
    brand: ((p.brands || '').split(',')[0] || '').trim(),
    servingSize: (p.serving_size || '').trim() || null,
    per100g,
    perServing,
  }
}

/** Short calories label for a result card. */
export function caloriesLabel(food) {
  if (food.perServing?.calories != null) {
    return `${Math.round(food.perServing.calories)} cal · serving`
  }
  if (food.per100g.calories != null) {
    return `${Math.round(food.per100g.calories)} cal · 100g`
  }
  return '— cal'
}
