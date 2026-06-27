// Body-measurement unit conversions.
//
// CANONICAL STORAGE IS ALWAYS METRIC: weights in kg, heights in cm. These
// helpers convert only at the UI edge so no calculation (Mifflin-St Jeor,
// weight-goal comparisons, charts) ever depends on the user's display unit.

const LB_PER_KG = 2.2046226218
const CM_PER_IN = 2.54

/* ---- weight: kg <-> lb ---- */

export const kgToLbs = (kg) => kg * LB_PER_KG
export const lbsToKg = (lbs) => lbs / LB_PER_KG

/* ---- height: cm <-> ft/in ---- */

export function cmToFtIn(cm) {
  if (cm == null || cm === '' || Number.isNaN(Number(cm))) return { ft: '', in: '' }
  const totalIn = Number(cm) / CM_PER_IN
  let ft = Math.floor(totalIn / 12)
  let inch = Math.round(totalIn - ft * 12)
  if (inch === 12) {
    ft += 1
    inch = 0
  }
  return { ft, in: inch }
}

export function ftInToCm(ft, inch) {
  const f = Number(ft) || 0
  const i = Number(inch) || 0
  if (!f && !i) return null
  return (f * 12 + i) * CM_PER_IN
}

/* ---- display formatting (metric in → string out) ---- */

export function weightToDisplayNumber(kg, system) {
  if (kg == null || kg === '' || Number.isNaN(Number(kg))) return ''
  return system === 'imperial'
    ? String(Math.round(kgToLbs(Number(kg))))
    : String(Math.round(Number(kg) * 10) / 10)
}

export function formatWeight(kg, system) {
  const n = weightToDisplayNumber(kg, system)
  if (n === '') return '—'
  return system === 'imperial' ? `${n} lb` : `${n} kg`
}

export function formatHeight(cm, system) {
  if (cm == null || cm === '') return '—'
  if (system === 'imperial') {
    const { ft, in: inch } = cmToFtIn(cm)
    return `${ft}'${inch}"`
  }
  return `${Math.round(Number(cm))} cm`
}

export const weightUnitLabel = (system) => (system === 'imperial' ? 'lb' : 'kg')

/* ---- parse a user-entered display value back to canonical metric ---- */

export function displayWeightToKg(value, system) {
  const n = Number(value)
  if (!value || Number.isNaN(n)) return null
  return system === 'imperial' ? lbsToKg(n) : n
}
