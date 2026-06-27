import { useEffect, useState } from 'react'
import {
  weightToDisplayNumber,
  displayWeightToKg,
  weightUnitLabel,
  cmToFtIn,
  ftInToCm,
} from '../lib/bodyUnits.js'

/* Segmented metric/imperial switch. */
export function UnitToggle({ system, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10 ${className}`}>
      {[
        ['metric', 'kg · cm'],
        ['imperial', 'lb · ft'],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
            system === key ? 'bg-brand text-surface' : 'text-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Weight input. Source of truth is kg (valueKg); the field shows kg or lb based
 * on `system` and emits kg via onChangeKg. The display buffer only re-syncs when
 * the unit changes, so it never drifts on toggle or jumps the cursor while typing.
 */
export function WeightInput({ valueKg, system, onChangeKg, placeholder = 'Weight', autoFocus }) {
  const [raw, setRaw] = useState(() => weightToDisplayNumber(valueKg, system))

  // Resync display when the unit changes (deliberate user action).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRaw(weightToDisplayNumber(valueKg, system)), [system])

  function handle(e) {
    const v = e.target.value
    setRaw(v)
    onChangeKg(displayWeightToKg(v, system))
  }

  return (
    <div className="flex items-center rounded-xl bg-white/5 px-4 ring-1 ring-white/10 focus-within:ring-brand">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        autoFocus={autoFocus}
        value={raw}
        onChange={handle}
        placeholder={placeholder}
        className="w-full bg-transparent py-3 text-base text-white placeholder:text-faint outline-none"
      />
      <span className="pl-2 text-sm text-muted">{weightUnitLabel(system)}</span>
    </div>
  )
}

/**
 * Height input. Source of truth is cm (valueCm). Metric shows one cm field;
 * imperial shows ft + in fields. Emits cm via onChangeCm (null when empty).
 */
export function HeightInput({ valueCm, system, onChangeCm }) {
  const initFtIn = cmToFtIn(valueCm)
  const [cm, setCm] = useState(() => (valueCm == null || valueCm === '' ? '' : String(Math.round(Number(valueCm)))))
  const [ft, setFt] = useState(() => (initFtIn.ft === '' ? '' : String(initFtIn.ft)))
  const [inch, setInch] = useState(() => (initFtIn.in === '' ? '' : String(initFtIn.in)))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (system === 'metric') {
      setCm(valueCm == null || valueCm === '' ? '' : String(Math.round(Number(valueCm))))
    } else {
      const f = cmToFtIn(valueCm)
      setFt(f.ft === '' ? '' : String(f.ft))
      setInch(f.in === '' ? '' : String(f.in))
    }
  }, [system])

  if (system === 'imperial') {
    const emit = (nextFt, nextIn) => onChangeCm(ftInToCm(nextFt, nextIn))
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center rounded-xl bg-white/5 px-4 ring-1 ring-white/10 focus-within:ring-brand">
          <input
            type="number"
            inputMode="numeric"
            value={ft}
            onChange={(e) => { setFt(e.target.value); emit(e.target.value, inch) }}
            placeholder="Height"
            className="w-full bg-transparent py-3 text-base text-white placeholder:text-faint outline-none"
          />
          <span className="pl-2 text-sm text-muted">ft</span>
        </div>
        <div className="flex items-center rounded-xl bg-white/5 px-4 ring-1 ring-white/10 focus-within:ring-brand">
          <input
            type="number"
            inputMode="numeric"
            value={inch}
            onChange={(e) => { setInch(e.target.value); emit(ft, e.target.value) }}
            placeholder="in"
            className="w-full bg-transparent py-3 text-base text-white placeholder:text-faint outline-none"
          />
          <span className="pl-2 text-sm text-muted">in</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center rounded-xl bg-white/5 px-4 ring-1 ring-white/10 focus-within:ring-brand">
      <input
        type="number"
        inputMode="decimal"
        value={cm}
        onChange={(e) => { setCm(e.target.value); onChangeCm(e.target.value === '' ? null : Number(e.target.value)) }}
        placeholder="Height"
        className="w-full bg-transparent py-3 text-base text-white placeholder:text-faint outline-none"
      />
      <span className="pl-2 text-sm text-muted">cm</span>
    </div>
  )
}
