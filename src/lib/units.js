// Approximate unit → grams conversions (volume units assume ~water density).
export const UNITS = [
  { key: 'g', label: 'g', grams: 1 },
  { key: 'oz', label: 'oz', grams: 28.3495 },
  { key: 'ml', label: 'ml', grams: 1 },
  { key: 'cup', label: 'cup', grams: 240 },
  { key: 'tbsp', label: 'tbsp', grams: 15 },
]

export function toGrams(amount, unitKey) {
  const u = UNITS.find((x) => x.key === unitKey) || UNITS[0]
  return (Number(amount) || 0) * u.grams
}

// Parse a leading number out of a serving-size string like "56 g" or "1.5 oz".
export function parseServingGrams(serving) {
  if (!serving) return null
  const m = String(serving).match(/([\d.]+)\s*(g|oz|ml|cup|tbsp)?/i)
  if (!m) return null
  const amount = Number(m[1])
  if (!amount) return null
  return Math.round(toGrams(amount, (m[2] || 'g').toLowerCase()))
}
