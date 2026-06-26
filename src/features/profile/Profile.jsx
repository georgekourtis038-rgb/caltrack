import { useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'

export default function Profile() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    supabase
      .from('profiles')
      .select('display_name, calorie_goal, partner_id, weight_goal_type')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (active) setProfile(data)
      })
    return () => {
      active = false
    }
  }, [user])

  const displayName = profile?.display_name || user?.email || 'You'
  const initial = displayName.trim().charAt(0).toUpperCase() || '🙂'

  const rows = [
    {
      label: 'Daily calorie goal',
      value: profile ? profile.calorie_goal.toLocaleString() : '—',
    },
    { label: 'Partner', value: profile?.partner_id ? 'Linked' : 'Not linked' },
    { label: 'Goal', value: profile?.weight_goal_type ?? 'Not set' },
  ]

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    // AuthContext's listener will swap back to the auth screen.
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Profile" />

      <section className="px-5">
        <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/20 text-xl font-bold text-brand">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{displayName}</p>
            <p className="truncate text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-slate-300">{r.label}</span>
              <span className="text-sm capitalize text-slate-500">{r.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 px-5">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-pink-400 ring-1 ring-white/10 transition-colors active:bg-white/5 disabled:opacity-60"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </section>
    </div>
  )
}
