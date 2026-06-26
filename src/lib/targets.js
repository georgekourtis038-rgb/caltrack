// Smart calorie + macro targets via the Mifflin-St Jeor equation.

const GOAL_ADJUSTMENT = { lose: -500, maintain: 0, gain: 400 }

/**
 * @param {object} p
 * @param {'male'|'female'} p.sex
 * @param {number} p.age            years
 * @param {number} p.heightCm
 * @param {number} p.weightKg       current weight
 * @param {'lose'|'maintain'|'gain'} p.goalType
 * @param {number} [p.activity]     activity multiplier (default lightly active)
 * @returns {{calories:number, protein:number, carbs:number, fat:number, bmr:number, tdee:number}|null}
 */
export function computeTargets({ sex, age, heightCm, weightKg, goalType, activity = 1.375 }) {
  if (!sex || !age || !heightCm || !weightKg) return null

  const s = sex === 'male' ? 5 : -161
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + s
  const tdee = bmr * activity
  const calories = Math.max(1200, Math.round((tdee + (GOAL_ADJUSTMENT[goalType] ?? 0)) / 10) * 10)

  // Protein ~2 g/kg, fat 25% of calories, carbs fill the rest.
  const protein = Math.round(weightKg * 2)
  const fat = Math.round((calories * 0.25) / 9)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))

  return { calories, protein, carbs, fat, bmr: Math.round(bmr), tdee: Math.round(tdee) }
}
