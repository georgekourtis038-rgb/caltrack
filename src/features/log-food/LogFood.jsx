import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useCelebrate } from '../celebrate/CelebrationProvider.jsx'
import { useFoodSearch } from './useFoodSearch.js'
import { useRecentFoods } from './useRecentFoods.js'
import { caloriesLabel } from './food.js'
import { logFoodEntry, mealTypeForNow } from './logFood.js'
import { analyzeText, analyzeImageFile } from './aiAnalyze.js'
import FoodDetailSheet from './FoodDetailSheet.jsx'
import ManualEntrySheet from './ManualEntrySheet.jsx'

export default function LogFood() {
  const { user } = useAuth()
  const { celebrateXp, celebrateBadges } = useCelebrate()
  const navigate = useNavigate()

  const [mode, setMode] = useState('search') // 'search' | 'ai'
  const [query, setQuery] = useState('')
  const { results, loading, error } = useFoodSearch(mode === 'search' ? query : '')
  const recents = useRecentFoods(user?.id)

  const [selected, setSelected] = useState(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [quickKey, setQuickKey] = useState(null)
  const [quickError, setQuickError] = useState(null)

  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState(null)
  const uploadRef = useRef(null)
  const cameraRef = useRef(null)

  function handleLogged() {
    setSelected(null)
    setManualOpen(false)
    navigate('/dashboard')
  }

  async function quickLog(recent) {
    setQuickError(null)
    setQuickKey(recent.key)
    try {
      const result = await logFoodEntry(user.id, {
        food_name: recent.food_name,
        meal_type: mealTypeForNow(),
        calories: recent.calories,
        protein: recent.protein,
        carbs: recent.carbs,
        fat: recent.fat,
        serving_size: recent.serving_size,
      })
      celebrateXp(result.xp)
      celebrateBadges(result.badges)
      navigate('/dashboard')
    } catch (e) {
      setQuickError(e.message)
      setQuickKey(null)
    }
  }

  async function runAnalyze(promise) {
    setAiBusy(true)
    setAiError(null)
    try {
      setSelected(await promise)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiBusy(false)
    }
  }

  function onFilePicked(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (file) runAnalyze(analyzeImageFile(file))
  }

  const q = query.trim()

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Log Food" subtitle="Search, snap, or describe it" />

      {/* Mode toggle */}
      <div className="px-5">
        <div className="relative flex rounded-xl bg-surface-2 p-1 ring-1 ring-white/5">
          {['search', 'ai'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="relative z-10 flex-1 py-2 text-sm font-semibold capitalize"
            >
              {mode === m && (
                <motion.span
                  layoutId="modePill"
                  className="absolute inset-0 -z-10 rounded-lg bg-brand"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={mode === m ? 'text-surface' : 'text-muted'}>
                {m === 'ai' ? '✨ AI' : 'Search'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'search' ? (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {recents.length > 0 && (
              <section className="mt-4 px-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">Quick add</p>
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                  {recents.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => quickLog(r)}
                      disabled={quickKey != null}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-sm font-medium text-ink ring-1 ring-white/10 transition-colors active:bg-white/5 disabled:opacity-50"
                    >
                      <span className="max-w-[10rem] truncate">{r.food_name}</span>
                      <span className="text-xs text-faint">
                        {quickKey === r.key ? '…' : Math.round(r.calories ?? 0)}
                      </span>
                    </button>
                  ))}
                </div>
                {quickError && <p className="mt-1 text-xs text-danger">{quickError}</p>}
              </section>
            )}

            <section className="mt-4 px-5">
              <input
                type="search"
                inputMode="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods…"
                className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-ink placeholder:text-faint outline-none ring-1 ring-white/10 focus:ring-brand"
              />
            </section>

            <section className="mt-4 px-5">
              {loading && <ResultsSkeleton />}
              {!loading && error && (
                <p className="rounded-xl bg-danger/10 p-4 text-center text-sm text-danger">{error}</p>
              )}
              {!loading && !error && q.length >= 2 && results.length === 0 && (
                <Empty onManual={() => setManualOpen(true)}>No matches for “{q}”.</Empty>
              )}
              {!loading && !error && q.length < 2 && (
                <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-faint ring-1 ring-white/5">
                  Search the USDA database to log a meal.
                </p>
              )}
              {!loading && results.length > 0 && (
                <ul className="space-y-2">
                  {results.map((food, i) => (
                    <motion.li
                      key={food.fdcId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    >
                      <button
                        onClick={() => setSelected(food)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 text-left ring-1 ring-white/5 transition-colors active:bg-white/5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{food.food_name}</p>
                          {food.brand && <p className="truncate text-xs text-faint">{food.brand}</p>}
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-muted">
                          {caloriesLabel(food)}
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="ai"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 px-5"
          >
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-faint">
              Describe your meal
            </label>
            <textarea
              rows={2}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="e.g. 3 scrambled eggs with cheddar and toast"
              className="w-full resize-none rounded-xl bg-surface-2 px-4 py-3 text-base text-ink placeholder:text-faint outline-none ring-1 ring-white/10 focus:ring-brand"
            />
            <button
              onClick={() => aiText.trim() && runAnalyze(analyzeText(aiText))}
              disabled={aiBusy || !aiText.trim()}
              className="mt-2 w-full rounded-xl bg-brand px-4 py-3 text-base font-semibold text-surface active:bg-brand-dark disabled:opacity-40"
            >
              {aiBusy ? 'Analyzing…' : '✨ Analyze description'}
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <PhotoButton icon="📷" label="Take photo" onClick={() => cameraRef.current?.click()} disabled={aiBusy} />
              <PhotoButton icon="🖼️" label="Upload photo" onClick={() => uploadRef.current?.click()} disabled={aiBusy} />
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFilePicked} />
            <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />

            {aiBusy && (
              <p className="mt-4 text-center text-sm text-muted">
                <span className="mr-1 inline-block animate-spin">⏳</span> Claude is estimating nutrition…
              </p>
            )}
            {aiError && <p className="mt-3 text-center text-sm text-danger">{aiError}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mt-5 px-5">
        <button
          onClick={() => setManualOpen(true)}
          className="w-full rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-white/5"
        >
          ✏️ Add manually
        </button>
      </section>

      <FoodDetailSheet food={selected} onClose={() => setSelected(null)} onLogged={handleLogged} />
      <ManualEntrySheet open={manualOpen} onClose={() => setManualOpen(false)} onLogged={handleLogged} />
    </div>
  )
}

function PhotoButton({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 rounded-2xl bg-surface-2 py-5 text-sm font-semibold text-ink ring-1 ring-white/10 transition-colors active:bg-white/5 disabled:opacity-50"
    >
      <span className="text-2xl">{icon}</span>
      {label}
    </button>
  )
}

function Empty({ children, onManual }) {
  return (
    <div className="rounded-xl bg-surface-2 p-6 text-center ring-1 ring-white/5">
      <p className="text-sm text-muted">{children}</p>
      <button onClick={onManual} className="mt-2 text-sm font-semibold text-brand">
        Add it manually
      </button>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
      ))}
    </ul>
  )
}
