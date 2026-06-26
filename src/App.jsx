import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav.jsx'
import Dashboard from './features/dashboard/Dashboard.jsx'
import LogFood from './features/log-food/LogFood.jsx'
import Progress from './features/progress/Progress.jsx'
import Battle from './features/battle/Battle.jsx'
import Profile from './features/profile/Profile.jsx'

export default function App() {
  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Scrollable page content; padding-bottom leaves room for the fixed nav */}
      <main className="flex-1 overflow-y-auto pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/log" element={<LogFood />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/battle" element={<Battle />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  )
}
