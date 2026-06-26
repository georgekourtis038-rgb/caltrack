// Foods come from our /api/food-search proxy already normalized to:
//   { fdcId, food_name, brand, calories, protein, carbs, fat, serving_size }
// where calories/protein/carbs/fat are per 100 g.

/** Short calories label for a result card. */
export function caloriesLabel(food) {
  if (food.calories != null) {
    return `${Math.round(food.calories)} cal · 100g`
  }
  return '— cal'
}
