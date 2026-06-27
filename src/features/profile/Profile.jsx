import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader.jsx'
import Avatar from '../../components/Avatar.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { BADGES } from '../badges/badges.js'
import { computeTargets } from '../../lib/targets.js'
import { UnitToggle, WeightInput, HeightInput } from '../../components/BodyFields.jsx'
import { formatWeight } from '../../lib/bodyUnits.js'
import { uploadAvatarBlob, removeAvatar } from './avatar.js'

// react-easy-crop is only needed when actually cropping — load on demand.
const AvatarCropper = lazy(() => import('./AvatarCropper.jsx'))

const AVATAR_COLORS = ['#e3b873', '#d98ba6', '#6fd0c5', '#e6b45c', '#a78bfa', '#e27d7d']

const ACTIVITY = [
  ['1.2', 'Sedentary'],
  ['1.375', 'Light'],
  ['1.55', 'Moderate'],
  ['1.725', 'Active'],
]

const GOAL_FIELDS = [
  { key: 'calorie_goal', label: 'Calories', suffix: 'kcal' },
  { key: 'protein_goal', label: 'Protein', suffix: 'g' },
  { key: 'carbs_goal', label: 'Carbs', suffix: 'g' },
  { key: 'fat_goal', label: 'Fat', suffix: 'g' },
]

export default function Profile() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [gam, setGam] = useState(null)
  const [unlocked, setUnlocked] = useState({})
  const [currentWeight, setCurrentWeight] = useState(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [cropFile, setCropFile] = useState(null)
  const uploadRef = useRef(null)
  const cameraRef = useRef(null)
  const [unitSystem, setUnitSystem] = useState('metric')
  const [stats, setStats] = useState({ age: '', height_cm: '', sex: '', weight_goal_type: '', goal_weight: '', activity_level: '1.375' })
  const [goals, setGoals] = useState({})
  const [savedAt, setSavedAt] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('gamification').select('level, total_xp').eq('user_id', user.id).single(),
      supabase.from('badges').select('badge_key, unlocked_at').eq('user_id', user.id),
      supabase
        .from('weight_logs')
        .select('weight')
        .eq('user_id', user.id)
        .order('logged_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([p, g, b, w]) => {
      if (!active) return
      const pr = p.data || {}
      setProfile(pr)
      setGam(g.data)
      setName(pr.display_name || '')
      setAvatarUrl(pr.avatar_url || null)
      setUnitSystem(pr.unit_system || 'metric')
      setStats({
        age: pr.age ?? '',
        height_cm: pr.height_cm ?? '',
        sex: pr.sex ?? '',
        weight_goal_type: pr.weight_goal_type ?? '',
        goal_weight: pr.goal_weight ?? '',
        activity_level: String(pr.activity_level ?? '1.375'),
      })
      setGoals({
        calorie_goal: pr.calorie_goal ?? '',
        protein_goal: pr.protein_goal ?? '',
        carbs_goal: pr.carbs_goal ?? '',
        fat_goal: pr.fat_goal ?? '',
      })
      const map = {}
      for (const row of b.data || []) map[row.badge_key] = row.unlocked_at
      setUnlocked(map)
      setCurrentWeight(w.data?.weight ?? null)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user])

  // Recommendation recalculates whenever stats or latest weight change.
  const recommended = useMemo(
    () =>
      computeTargets({
        sex: stats.sex,
        age: Number(stats.age),
        heightCm: Number(stats.height_cm),
        weightKg: Number(currentWeight),
        goalType: stats.weight_goal_type,
        activity: Number(stats.activity_level) || 1.375,
      }),
    [stats, currentWeight]
  )

  async function save(patch) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (!error) {
      setProfile((p) => ({ ...p, ...patch }))
      setSavedAt(Date.now())
    }
  }

  function saveStat(key) {
    const raw = stats[key]
    let value = raw === '' ? null : raw
    if (['age'].includes(key) && value != null) value = Math.round(Number(value))
    if (['height_cm', 'goal_weight', 'activity_level'].includes(key) && value != null) value = Number(value)
    save({ [key]: value })
  }

  function saveGoals(next = goals) {
    const patch = {}
    for (const f of GOAL_FIELDS) {
      const v = next[f.key]
      patch[f.key] = v === '' || v == null ? null : Math.round(Number(v))
    }
    save(patch)
  }

  // Persist a new stat value directly (used by the unit-aware body fields,
  // which already produce canonical metric numbers).
  function commitStat(key, value) {
    setStats((s) => ({ ...s, [key]: value ?? '' }))
    save({ [key]: value == null || value === '' ? null : Number(value) })
  }

  function changeUnitSystem(next) {
    setUnitSystem(next)
    save({ unit_system: next })
  }

  function onPhotoPicked(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setPhotoError(null)
    setCropFile(file) // open the cropper; upload happens on confirm
  }

  async function onCropConfirm(blob) {
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      const url = await uploadAvatarBlob(user.id, blob)
      setAvatarUrl(url)
      setCropFile(null)
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function clearPhoto() {
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      await removeAvatar(user.id)
      setAvatarUrl(null)
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  function applyRecommended() {
    if (!recommended) return
    const next = {
      calorie_goal: recommended.calories,
      protein_goal: recommended.protein,
      carbs_goal: recommended.carbs,
      fat_goal: recommended.fat,
    }
    setGoals(next)
    saveGoals(next)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 pt-6">
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
      </div>
    )
  }

  const color = profile?.avatar_color || AVATAR_COLORS[0]

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <PageHeader title="Profile" />

      {/* Identity */}
      <section className="rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={photoBusy}
            aria-label="Change profile photo"
            className="relative shrink-0 rounded-full active:scale-95 disabled:opacity-60"
          >
            <Avatar url={avatarUrl} color={color} name={name || user?.email} size={64} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-surface ring-2 ring-surface-2">
              {photoBusy ? (
                <span className="block h-3 w-3 animate-spin rounded-full border-2 border-surface/40 border-t-surface" />
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              )}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== profile.display_name && save({ display_name: name.trim() })}
              className="w-full rounded-lg bg-transparent text-lg font-semibold text-ink outline-none focus:bg-white/5 focus:px-2"
            />
            <p className="truncate text-sm text-muted">{user?.email}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-surface">Level {gam?.level ?? 1}</span>
          <span className="tnum text-sm text-muted">{(gam?.total_xp ?? 0).toLocaleString()} XP</span>
        </div>

        {/* Photo controls */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={photoBusy}
            className="rounded-xl bg-white/5 py-2.5 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-white/10 disabled:opacity-50"
          >
            📷 Take photo
          </button>
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={photoBusy}
            className="rounded-xl bg-white/5 py-2.5 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-white/10 disabled:opacity-50"
          >
            🖼️ Upload photo
          </button>
        </div>
        {avatarUrl && (
          <button onClick={clearPhoto} disabled={photoBusy} className="mt-2 text-xs font-semibold text-danger">
            Remove photo
          </button>
        )}
        {photoError && <p className="mt-2 text-xs text-danger">{photoError}</p>}
        <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhotoPicked} />
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={onPhotoPicked} />

        {/* Avatar color (used when no photo is set) */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
            Avatar color {avatarUrl && <span className="text-faint">(shown when no photo)</span>}
          </p>
          <div className="flex items-center gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => save({ avatar_color: c })}
                aria-label={`Set color ${c}`}
                className={`h-8 w-8 rounded-full transition-transform active:scale-90 ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-2' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
            {/* Custom color picker */}
            <label
              className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-white/20 active:scale-90"
              style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
              aria-label="Pick a custom color"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => save({ avatar_color: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Body stats */}
      <section className="mt-4 rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Your stats</h2>
          <UnitToggle system={unitSystem} onChange={changeUnitSystem} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatField label="Age" value={stats.age} onChange={(v) => setStats((s) => ({ ...s, age: v }))} onBlur={() => saveStat('age')} />
          <div>
            <span className="mb-1 block text-xs text-muted">Current weight</span>
            <div className="rounded-xl bg-white/5 px-3 py-2.5 text-base text-muted ring-1 ring-white/10">
              {currentWeight != null ? formatWeight(currentWeight, unitSystem) : '—'}
            </div>
          </div>
        </div>

        <p className="mb-1.5 mt-3 text-xs text-muted">Height</p>
        <HeightInput valueCm={stats.height_cm} system={unitSystem} onChangeCm={(v) => commitStat('height_cm', v)} />

        <p className="mb-1.5 mt-3 text-xs text-muted">Goal weight</p>
        <WeightInput valueKg={stats.goal_weight} system={unitSystem} onChangeKg={(v) => commitStat('goal_weight', v)} placeholder="Target weight" />

        <p className="mb-1.5 mt-3 text-xs text-muted">Sex</p>
        <div className="grid grid-cols-2 gap-2">
          {['male', 'female'].map((s) => (
            <Toggle key={s} active={stats.sex === s} onClick={() => { setStats((p) => ({ ...p, sex: s })); save({ sex: s }) }}>
              {s === 'male' ? 'Male' : 'Female'}
            </Toggle>
          ))}
        </div>

        <p className="mb-1.5 mt-3 text-xs text-muted">Goal</p>
        <div className="grid grid-cols-3 gap-2">
          {['lose', 'maintain', 'gain'].map((g) => (
            <Toggle key={g} active={stats.weight_goal_type === g} onClick={() => { setStats((p) => ({ ...p, weight_goal_type: g })); save({ weight_goal_type: g }) }}>
              {g[0].toUpperCase() + g.slice(1)}
            </Toggle>
          ))}
        </div>

        <p className="mb-1.5 mt-3 text-xs text-muted">Activity level</p>
        <div className="grid grid-cols-4 gap-2">
          {ACTIVITY.map(([val, label]) => (
            <Toggle key={val} active={stats.activity_level === val} onClick={() => { setStats((p) => ({ ...p, activity_level: val })); save({ activity_level: Number(val) }) }}>
              {label}
            </Toggle>
          ))}
        </div>
      </section>

      {/* Smart recommendation */}
      <section className="mt-4 rounded-2xl bg-gradient-to-br from-brand/15 to-surface-2 p-5 ring-1 ring-brand/25">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink">Smart targets</h2>
          <span className="rounded-md bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
            Auto
          </span>
        </div>
        {recommended ? (
          <>
            <p className="mt-1 text-xs text-muted">Calculated from your stats (Mifflin-St Jeor).</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                ['Cal', recommended.calories],
                ['Protein', `${recommended.protein}g`],
                ['Carbs', `${recommended.carbs}g`],
                ['Fat', `${recommended.fat}g`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-black/25 py-2">
                  <p className="tnum font-display text-base font-bold text-ink">{v}</p>
                  <p className="text-[10px] uppercase tracking-wide text-faint">{l}</p>
                </div>
              ))}
            </div>
            <button
              onClick={applyRecommended}
              className="mt-3 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-surface shadow-lg shadow-brand/20 active:bg-brand-dark"
            >
              Use these targets
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Add your <span className="text-ink">sex, age, height</span>
            {currentWeight == null && <> and log a <span className="text-ink">weight</span></>} above, and
            we'll auto-calculate your ideal calories and macros.
          </p>
        )}
      </section>

      {/* Goals */}
      <section className="mt-4 rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Daily goals</h2>
          {savedAt && <span className="text-xs text-brand">Saved ✓</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {GOAL_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs text-muted">
                {f.label} <span className="text-faint">({f.suffix})</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={goals[f.key]}
                onChange={(e) => setGoals((g) => ({ ...g, [f.key]: e.target.value }))}
                onBlur={() => saveGoals()}
                className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-base text-ink outline-none ring-1 ring-white/10 focus:ring-brand"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Trophy shelf */}
      <section className="mt-4">
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink">Badges</h2>
        <div className="grid grid-cols-2 gap-3">
          {BADGES.map((b, i) => {
            const date = unlocked[b.key]
            const isUnlocked = Boolean(date)
            return (
              <motion.div
                key={b.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className={`rounded-2xl p-4 ring-1 ${isUnlocked ? 'bg-surface-2 ring-brand/30' : 'bg-surface-2/40 ring-white/5'}`}
              >
                <div className={`text-3xl ${isUnlocked ? '' : 'opacity-30 grayscale'}`}>{b.icon}</div>
                <p className={`mt-1.5 text-sm font-semibold ${isUnlocked ? 'text-ink' : 'text-faint'}`}>{b.name}</p>
                {isUnlocked ? (
                  <p className="text-[11px] text-brand">{new Date(date).toLocaleDateString()}</p>
                ) : (
                  <p className="text-[11px] text-faint">{b.condition}</p>
                )}
              </motion.div>
            )
          })}
        </div>
      </section>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-6 w-full rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-danger ring-1 ring-white/10 active:bg-white/5 disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      {cropFile && (
        <Suspense fallback={null}>
          <AvatarCropper
            file={cropFile}
            color={color}
            onCancel={() => !photoBusy && setCropFile(null)}
            onConfirm={onCropConfirm}
          />
        </Suspense>
      )}
    </div>
  )
}

function StatField({ label, value, onChange, onBlur }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-base text-ink outline-none ring-1 ring-white/10 focus:ring-brand"
      />
    </label>
  )
}

function Toggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-2 text-xs font-semibold transition-colors ${active ? 'bg-brand text-surface' : 'bg-white/5 text-muted active:bg-white/10'}`}
    >
      {children}
    </button>
  )
}
