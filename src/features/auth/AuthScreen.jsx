import { useState } from 'react'
import { useAuth } from './AuthContext.jsx'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const isSignup = mode === 'signup'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)

    const action = isSignup ? signUp : signIn
    const { data, error } = await action(email.trim(), password)

    setBusy(false)

    if (error) {
      setError(error.message)
      return
    }

    // On signup, Supabase may require email confirmation: in that case
    // there's a user but no active session yet.
    if (isSignup && data?.user && !data?.session) {
      setNotice('Check your email to confirm your account, then sign in.')
      setMode('signin')
      setPassword('')
    }
    // Otherwise onAuthStateChange swaps us into the app automatically.
  }

  function switchMode() {
    setMode(isSignup ? 'signin' : 'signup')
    setError(null)
    setNotice(null)
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-3xl">
            🔥
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">CalTrack</h1>
          <p className="mt-1 text-sm text-slate-400">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-pink-500/10 px-3 py-2 text-sm text-pink-300">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand px-4 py-3 text-base font-semibold text-surface transition-colors active:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-brand active:text-brand-dark"
          >
            {isSignup ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
