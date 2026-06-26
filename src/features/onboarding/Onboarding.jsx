import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext.jsx'
import { savePendingOnboarding } from './pendingOnboarding.js'

const TOTAL_STEPS = 8 // 0..6 are onboarding slides, 7 is auth

const slide = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [data, setData] = useState({
    name: '',
    age: '',
    sex: '',
    height: '',
    weight: '',
    goalType: '',
    goalWeight: '',
  })

  const set = (key, value) => setData((d) => ({ ...d, [key]: value }))
  const go = (next) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  // Per-step validation for the Continue button.
  const canContinue = {
    0: true,
    1: data.name.trim().length > 0,
    2: data.age && data.sex,
    3: data.height && data.weight,
    4: !!data.goalType,
    5: !!data.goalWeight,
    6: true,
  }[step]

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-surface to-[#0b1220] pt-safe pb-safe">
      {/* Progress + skip */}
      <div className="flex items-center gap-3 px-5 pt-4">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-brand' : 'bg-white/10'}`}
            />
          ))}
        </div>
        {step < 7 && (
          <button onClick={() => go(7)} className="text-xs font-semibold text-slate-400">
            Log in
          </button>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={step}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-0 flex flex-col px-6 pt-6"
          >
            {step === 0 && <Welcome />}
            {step === 1 && (
              <Question title="What's your name?" subtitle="So we can make CalTrack yours.">
                <TextInput value={data.name} onChange={(v) => set('name', v)} placeholder="Your name" autoFocus />
              </Question>
            )}
            {step === 2 && (
              <Question title="A bit about you" subtitle="We use this to tailor your targets.">
                <NumberInput value={data.age} onChange={(v) => set('age', v)} placeholder="Age" suffix="yrs" />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {['male', 'female'].map((s) => (
                    <Choice key={s} active={data.sex === s} onClick={() => set('sex', s)}>
                      {s === 'male' ? '♂ Male' : '♀ Female'}
                    </Choice>
                  ))}
                </div>
              </Question>
            )}
            {step === 3 && (
              <Question title="Your measurements" subtitle="Used for accurate calorie math.">
                <NumberInput value={data.height} onChange={(v) => set('height', v)} placeholder="Height" suffix="cm" />
                <div className="mt-3" />
                <NumberInput value={data.weight} onChange={(v) => set('weight', v)} placeholder="Current weight" suffix="kg" />
              </Question>
            )}
            {step === 4 && (
              <Question title="What's your goal?" subtitle="Pick the direction you're headed.">
                <div className="space-y-3">
                  {[
                    ['lose', '📉 Lose weight'],
                    ['maintain', '⚖️ Maintain'],
                    ['gain', '📈 Gain weight'],
                  ].map(([key, label]) => (
                    <Choice key={key} active={data.goalType === key} onClick={() => set('goalType', key)} block>
                      {label}
                    </Choice>
                  ))}
                </div>
              </Question>
            )}
            {step === 5 && (
              <Question title="Goal weight" subtitle="What are you aiming for?">
                <NumberInput value={data.goalWeight} onChange={(v) => set('goalWeight', v)} placeholder="Target weight" suffix="kg" />
              </Question>
            )}
            {step === 6 && <BattlePeek name={data.name} />}
            {step === 7 && <AuthStep data={data} onBack={() => go(6)} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav (hidden on auth step, which has its own buttons) */}
      {step < 7 && (
        <div className="flex items-center gap-3 px-6 pb-4 pt-2">
          {step > 0 && (
            <button
              onClick={() => go(step - 1)}
              className="rounded-xl bg-white/5 px-5 py-3.5 text-sm font-semibold text-slate-300 active:bg-white/10"
            >
              Back
            </button>
          )}
          <button
            onClick={() => go(step + 1)}
            disabled={!canContinue}
            className="flex-1 rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-surface shadow-lg shadow-brand/20 transition active:bg-brand-dark disabled:opacity-40 disabled:shadow-none"
          >
            {step === 6 ? 'Get started' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  )
}

function Welcome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-brand/25 to-brand/5 text-6xl ring-1 ring-brand/20"
      >
        🔥
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="font-display text-5xl font-bold tracking-tight text-white"
      >
        CalTrack
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-3 max-w-xs text-lg text-slate-300"
      >
        Track smarter. Compete with your partner. Crush your goals together.
      </motion.p>
    </div>
  )
}

function BattlePeek({ name }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <h2 className="font-display text-center text-2xl font-bold text-white">Better together</h2>
      <p className="mt-1 text-center text-sm text-slate-400">
        Link up with your partner and battle for the weekly XP crown.
      </p>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
        className="mt-6 rounded-3xl bg-surface-2 p-5 ring-1 ring-white/10"
      >
        <div className="flex items-center justify-between">
          <Avatar label={name || 'You'} color="#22c55e" />
          <span className="text-sm font-bold text-slate-500">VS</span>
          <Avatar label="Partner" color="#ec4899" />
        </div>
        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div className="bg-brand" initial={{ width: 0 }} animate={{ width: '62%' }} transition={{ delay: 0.5, duration: 0.8 }} />
          <div className="flex-1 bg-pink-500" />
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-brand">You're winning by 120 XP 👑</p>
      </motion.div>
    </div>
  )
}

function Avatar({ label, color }) {
  return (
    <div className="text-center">
      <div
        className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-surface"
        style={{ backgroundColor: color }}
      >
        {label.charAt(0).toUpperCase()}
      </div>
      <p className="max-w-[6rem] truncate text-xs font-semibold text-white">{label}</p>
    </div>
  )
}

function AuthStep({ data, onBack }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const isSignup = mode === 'signup'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    if (!isSignup) {
      const { error } = await signIn(email.trim(), password)
      setBusy(false)
      if (error) setError(error.message)
      return
    }

    // Stash answers first; they're applied reliably once authenticated
    // (see applyPendingOnboarding in App).
    savePendingOnboarding({ ...data, email: email.trim() })

    const { data: res, error } = await signUp(email.trim(), password)
    if (error) {
      setBusy(false)
      return setError(error.message)
    }

    if (res.user && !res.session) {
      setNotice('Check your email to confirm your account, then log in.')
      setMode('signin')
    }
    // Otherwise onAuthStateChange swaps us into the app and the pending
    // onboarding data is written there.
    setBusy(false)
  }

  return (
    <div className="flex flex-1 flex-col justify-center">
      <h2 className="font-display text-3xl font-bold text-white">
        {isSignup ? `You're all set${data.name ? `, ${data.name}` : ''}!` : 'Welcome back'}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {isSignup ? 'Create your account to save your plan.' : 'Log in to continue.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
        />
        {error && <p className="rounded-lg bg-pink-500/10 px-3 py-2 text-sm text-pink-300">{error}</p>}
        {notice && <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-surface active:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button onClick={onBack} className="font-semibold text-slate-400">
          ← Back
        </button>
        <button
          onClick={() => {
            setMode(isSignup ? 'signin' : 'signup')
            setError(null)
            setNotice(null)
          }}
          className="font-semibold text-brand"
        >
          {isSignup ? 'I already have an account' : 'Create an account'}
        </button>
      </div>
    </div>
  )
}

/* --- small shared bits --- */

function Question({ title, subtitle, children }) {
  return (
    <div className="flex flex-1 flex-col pt-10">
      <h2 className="font-display text-3xl font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function TextInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl bg-surface-2 px-4 py-3.5 text-lg text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
    />
  )
}

function NumberInput({ value, onChange, placeholder, suffix }) {
  return (
    <div className="flex items-center rounded-xl bg-surface-2 px-4 ring-1 ring-white/10 focus-within:ring-brand">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-3.5 text-lg text-white placeholder:text-slate-500 outline-none"
      />
      {suffix && <span className="pl-2 text-sm text-slate-500">{suffix}</span>}
    </div>
  )
}

function Choice({ active, onClick, children, block }) {
  return (
    <button
      onClick={onClick}
      className={`${block ? 'w-full' : ''} rounded-xl px-4 py-3.5 text-base font-semibold transition-colors ${
        active ? 'bg-brand text-surface' : 'bg-surface-2 text-slate-200 ring-1 ring-white/10 active:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}
