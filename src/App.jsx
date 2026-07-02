import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './features/auth/AuthContext.jsx'
import Onboarding from './features/onboarding/Onboarding.jsx'
import { applyPendingOnboarding, hasPendingOnboarding } from './features/onboarding/pendingOnboarding.js'
import BottomNav from './components/BottomNav.jsx'
import PushAnnouncement from './features/notifications/PushAnnouncement.jsx'
import Dashboard from './features/dashboard/Dashboard.jsx'
import LogFood from './features/log-food/LogFood.jsx'
import Battle from './features/battle/Battle.jsx'
import Profile from './features/profile/Profile.jsx'

// Progress pulls in recharts (heavy) — load it only when visited.
const Progress = lazy(() => import('./features/progress/Progress.jsx'))

function Splash({ message }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-brand" />
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  )
}

function RouteSpinner() {
  return (
    <div className="flex justify-center pt-16">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-brand" />
    </div>
  )
}

export default function App() {
  const { loading, user } = useAuth()
  const [applying, setApplying] = useState(false)

  // Write any pending onboarding answers as soon as the new account is live.
  useEffect(() => {
    if (!user || !hasPendingOnboarding()) return
    let active = true
    setApplying(true)
    applyPendingOnboarding(user.id).finally(() => {
      if (active) setApplying(false)
    })
    return () => {
      active = false
    }
  }, [user])

  // Brief splash while we hydrate the persisted session.
  if (loading) return <Splash />
  if (user && applying) return <Splash message="Setting up your plan…" />

  // Not signed in → premium onboarding flow (ends in sign up / log in).
  if (!user) {
    return (
      <div className="h-full bg-surface">
        <Onboarding />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Scrollable page content; padding-bottom leaves room for the fixed nav */}
      <main className="flex-1 overflow-y-auto pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/log" element={<LogFood />} />
          <Route
            path="/progress"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Progress />
              </Suspense>
            }
          />
          <Route path="/battle" element={<Battle />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <BottomNav />
      <PushAnnouncement />
    </div>
  )
}
