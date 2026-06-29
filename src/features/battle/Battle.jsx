import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader.jsx'
import Avatar from '../../components/Avatar.jsx'
import DayDetailSheet from './DayDetailSheet.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { dayAdherenceXp } from '../../lib/nutrition.js'
import { isoDate, todayISO, relativeTime } from '../../lib/dates.js'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function dailyCalories(logs) {
  const m = {}
  for (const l of logs || []) {
    m[l.logged_date] = (m[l.logged_date] || 0) + (Number(l.calories) || 0)
  }
  return m
}

async function loadOverall(userId) {
  const [gam, badges] = await Promise.all([
    supabase.from('gamification').select('current_streak, level, updated_at').eq('user_id', userId).single(),
    supabase.from('badges').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  return {
    streak: gam.data?.current_streak ?? 0,
    level: gam.data?.level ?? 1,
    badges: badges.count ?? 0,
    updatedAt: gam.data?.updated_at ?? null,
  }
}

export default function Battle() {
  const { user } = useAuth()
  const now = new Date()
  const [me, setMe] = useState(null)
  const [partner, setPartner] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewed, setViewed] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDay, setSelectedDay] = useState(null)

  const [email, setEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState(null)

  const load = useCallback(
    async (view) => {
      if (!user) return
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name, calorie_goal, avatar_color, avatar_url, partner_id')
        .eq('id', user.id)
        .single()
      setMe(myProfile)

      if (!myProfile?.partner_id) {
        setPartner(null)
        setData(null)
        setLoading(false)
        return
      }

      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('display_name, calorie_goal, avatar_color, avatar_url')
        .eq('id', myProfile.partner_id)
        .single()
      setPartner({ id: myProfile.partner_id, ...partnerProfile })

      const start = isoDate(new Date(view.year, view.month, 1))
      const end = isoDate(new Date(view.year, view.month + 1, 0))
      const [myLogs, theirLogs, myOverall, theirOverall] = await Promise.all([
        supabase.from('food_logs').select('logged_date, calories').eq('user_id', user.id).gte('logged_date', start).lte('logged_date', end),
        supabase.from('food_logs').select('logged_date, calories').eq('user_id', myProfile.partner_id).gte('logged_date', start).lte('logged_date', end),
        loadOverall(user.id),
        loadOverall(myProfile.partner_id),
      ])

      setData({
        myGoal: myProfile.calorie_goal ?? 2000,
        theirGoal: partnerProfile?.calorie_goal ?? 2000,
        myCal: dailyCalories(myLogs.data),
        theirCal: dailyCalories(theirLogs.data),
        myOverall,
        theirOverall,
      })
      setLoading(false)
    },
    [user]
  )

  useEffect(() => {
    load(viewed)
  }, [load, viewed])

  // Realtime: a partner log updates their gamification row → refresh the view.
  useEffect(() => {
    if (!partner?.id) return
    const channel = supabase
      .channel(`battle-${partner.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gamification', filter: `user_id=eq.${partner.id}` },
        () => load(viewed)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [partner?.id, load, viewed])

  async function connect(e) {
    e.preventDefault()
    setLinking(true)
    setLinkError(null)
    const { data: res, error } = await supabase.rpc('link_partner', { partner_email: email.trim() })
    setLinking(false)
    if (error) return setLinkError(error.message)
    if (!res?.ok) return setLinkError(res?.error || 'Could not link')
    setEmail('')
    setLoading(true)
    load(viewed)
  }

  async function disconnect() {
    await supabase.rpc('unlink_partner')
    setLoading(true)
    load(viewed)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 pt-6">
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    )
  }

  // Distinct battle colors (shared by the bars, calendar, and detail sheet).
  const myColor = me?.avatar_color || '#e3b873'
  let theirColor = partner?.avatar_color || '#d98ba6'
  if (theirColor.toLowerCase() === myColor.toLowerCase()) theirColor = '#6fd0c5'
  const colors = { myColor, theirColor }

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <PageHeader title="Battle" subtitle="A new contest every day" />

      {partner && data ? (
        <>
          <DailyBattle
            me={me}
            partner={partner}
            data={data}
            colors={colors}
            viewed={viewed}
            setViewed={setViewed}
            onSelectDay={setSelectedDay}
            onDisconnect={disconnect}
          />
          <DayDetailSheet
            day={selectedDay}
            me={me}
            partner={partner}
            goals={{ myGoal: data.myGoal, theirGoal: data.theirGoal }}
            colors={colors}
            onClose={() => setSelectedDay(null)}
          />
        </>
      ) : (
        <ConnectPartner email={email} setEmail={setEmail} onSubmit={connect} linking={linking} error={linkError} />
      )}
    </div>
  )
}

function DailyBattle({ me, partner, data, colors, viewed, setViewed, onSelectDay, onDisconnect }) {
  const { myColor, theirColor } = colors
  const today = todayISO()
  const theirName = partner.display_name || 'Partner'

  const score = (cal, who) => dayAdherenceXp(cal, who === 'me' ? data.myGoal : data.theirGoal)

  const myToday = score(data.myCal[today] || 0, 'me')
  const theirToday = score(data.theirCal[today] || 0, 'them')
  const todayTotal = myToday + theirToday
  const myShare = todayTotal > 0 ? (myToday / todayTotal) * 100 : 50

  // Calendar for the viewed month.
  const { year, month } = viewed
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7 // Mon-based

  const now = new Date()
  const canNext = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())

  const cells = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  let myWins = 0
  let theirWins = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoDate(new Date(year, month, d))
    const future = iso > today
    const myXp = score(data.myCal[iso] || 0, 'me')
    const theirXp = score(data.theirCal[iso] || 0, 'them')
    let winner = 'none'
    if (future) winner = 'future'
    else if (myXp === 0 && theirXp === 0) winner = 'none'
    else if (myXp === theirXp) winner = 'tie'
    else winner = myXp > theirXp ? 'me' : 'them'
    if (winner === 'me') myWins++
    if (winner === 'them') theirWins++
    cells.push({ d, iso, winner, isToday: iso === today, future })
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  function shiftMonth(delta) {
    if (delta > 0 && !canNext) return
    const nm = month + delta
    setViewed({ year: year + Math.floor(nm / 12), month: ((nm % 12) + 12) % 12 })
  }

  return (
    <>
      {/* Heads */}
      <div className="flex items-center justify-between">
        <Head profile={me} label="You" align="left" />
        <span className="font-display text-sm font-bold text-faint">VS</span>
        <Head profile={partner} label={theirName} align="right" />
      </div>

      {/* Today's battle */}
      <div className="mt-5 rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink">Today’s battle</h2>
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Live</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
          <div className="transition-all duration-500" style={{ width: `${myShare}%`, backgroundColor: myColor }} />
          <div className="transition-all duration-500" style={{ width: `${100 - myShare}%`, backgroundColor: theirColor }} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="tnum text-lg font-bold" style={{ color: myColor }}>{myToday}</span>
          <span className="text-center text-sm font-semibold text-ink">{todayHeadline(myToday, theirToday, theirName)}</span>
          <span className="tnum text-lg font-bold" style={{ color: theirColor }}>{theirToday}</span>
        </div>
        <p className="mt-1 text-center text-[11px] text-faint">Score = how close each of you is to your calorie goal today</p>
      </div>

      {/* Month win calendar */}
      <div className="mt-4 rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
        <div className="mb-3 flex items-center justify-between">
          <MonthChevron dir="left" onClick={() => shiftMonth(-1)} />
          <div className="text-center">
            <h2 className="font-display text-base font-bold text-ink">{monthLabel}</h2>
            <span className="text-xs font-semibold">
              <span style={{ color: myColor }}>{myWins}</span>
              <span className="text-faint"> – </span>
              <span style={{ color: theirColor }}>{theirWins}</span>
            </span>
          </div>
          <MonthChevron dir="right" onClick={() => shiftMonth(1)} disabled={!canNext} />
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-faint">{w}</div>
          ))}
          {cells.map((c, i) =>
            c === null ? (
              <div key={`b${i}`} />
            ) : (
              <DayCell key={c.iso} cell={c} myColor={myColor} theirColor={theirColor} onSelect={onSelectDay} />
            )
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted">
          <Legend color={myColor} label="You" />
          <Legend color={theirColor} label={theirName} />
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/15" /> Tie</span>
        </div>
        <p className="mt-2 text-center text-[11px] text-faint">Tap a day to see both your meals</p>
      </div>

      {/* Overall standing */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/5">
        {[
          ['Streak', `${data.myOverall.streak}🔥`, `${data.theirOverall.streak}🔥`],
          ['Level', data.myOverall.level, data.theirOverall.level],
          ['Badges', data.myOverall.badges, data.theirOverall.badges],
        ].map(([label, mine, theirs], i) => (
          <div key={label} className={`grid grid-cols-3 items-center px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
            <span className="text-left text-base font-bold" style={{ color: myColor }}>{mine}</span>
            <span className="text-center text-xs uppercase tracking-wide text-faint">{label}</span>
            <span className="text-right text-base font-bold" style={{ color: theirColor }}>{theirs}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-faint">{theirName} last active {relativeTime(data.theirOverall.updatedAt)}</p>

      <button
        onClick={onDisconnect}
        className="mt-5 w-full rounded-xl bg-surface-2 px-4 py-2.5 text-xs font-semibold text-muted ring-1 ring-white/10 active:bg-white/5"
      >
        Disconnect partner
      </button>
    </>
  )
}

function todayHeadline(mine, theirs, theirName) {
  if (mine === 0 && theirs === 0) return 'No one’s logged yet'
  if (mine === theirs) return 'Dead even'
  return mine > theirs ? 'You’re ahead' : `${theirName} is ahead`
}

function MonthChevron({ dir, onClick, disabled }) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.88 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Previous month' : 'Next month'}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink ring-1 ring-white/10 transition-opacity active:bg-white/5 disabled:opacity-25"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </motion.button>
  )
}

function DayCell({ cell, myColor, theirColor, onSelect }) {
  const base = 'flex aspect-square w-full items-center justify-center rounded-lg text-xs font-semibold transition-transform active:scale-90'
  const ring = cell.isToday ? ' ring-2 ring-ink/50' : ''

  if (cell.future) {
    return <div className={`${base.replace('active:scale-90', '')}${ring} text-faint/40`}>{cell.d}</div>
  }

  let cls = `${base}${ring} `
  let style
  if (cell.winner === 'none') cls += 'bg-white/[0.03] text-faint'
  else if (cell.winner === 'tie') cls += 'bg-white/15 text-ink'
  else {
    cls += 'text-surface'
    style = { backgroundColor: cell.winner === 'me' ? myColor : theirColor }
  }

  return (
    <button type="button" onClick={() => onSelect({ iso: cell.iso })} className={cls} style={style}>
      {cell.d}
    </button>
  )
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="max-w-[5rem] truncate">{label}</span>
    </span>
  )
}

function Head({ profile, label, align }) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <div className={`mb-1 ${align === 'right' ? 'flex justify-end' : ''}`}>
        <Avatar url={profile?.avatar_url} color={profile?.avatar_color || '#e3b873'} name={label} size={52} />
      </div>
      <p className="max-w-[7rem] truncate text-sm font-semibold text-ink">{label}</p>
    </div>
  )
}

function ConnectPartner({ email, setEmail, onSubmit, linking, error }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-6 ring-1 ring-white/5">
      <div className="mb-3 text-center text-4xl">🤝</div>
      <h2 className="text-center text-lg font-bold text-ink">Connect your partner</h2>
      <p className="mt-1 text-center text-sm text-muted">
        Enter your partner's CalTrack email to link up and start your daily battle.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input
          type="email"
          inputMode="email"
          required
          placeholder="partner@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-4 py-3 text-base text-ink placeholder:text-faint outline-none ring-1 ring-white/10 focus:ring-brand"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={linking}
          className="w-full rounded-xl bg-brand px-4 py-3 text-base font-semibold text-surface active:bg-brand-dark disabled:opacity-60"
        >
          {linking ? 'Connecting…' : 'Connect partner'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-faint">
        Linking is instant and mutual — once connected, you'll both see each other here.
      </p>
    </div>
  )
}
