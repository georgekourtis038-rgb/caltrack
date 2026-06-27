// Local-time date helpers (everything keyed to the user's clock, not UTC).

export function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return isoDate(new Date())
}

// Shift an ISO date by n days (noon avoids DST edges). Returns ISO.
export function addDaysISO(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

// Friendly label for a day navigator: "Today", "Yesterday", else "Mon, Jun 23".
export function dayLabel(iso) {
  const today = todayISO()
  if (iso === today) return 'Today'
  if (iso === addDaysISO(today, -1)) return 'Yesterday'
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// Array of the last n ISO dates ending today (oldest first).
export function lastNDates(n) {
  const out = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push(isoDate(d))
  }
  return out
}

// Monday of the current week, as an ISO date.
export function startOfWeekISO(d = new Date()) {
  const diff = (d.getDay() + 6) % 7 // days since Monday (Mon=0 … Sun=6)
  const m = new Date(d)
  m.setDate(d.getDate() - diff)
  return isoDate(m)
}

// ISO week key, e.g. "2026-W26". Mon–Sun, so Sat & Sun share a week.
export function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    )
  return `${d.getUTCFullYear()}-W${week}`
}

// "5m ago" / "3h ago" / "2d ago".
export function relativeTime(iso) {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
