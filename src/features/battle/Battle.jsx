import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import Avatar from '../../components/Avatar.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { groupByDay, isGoalHit } from '../../lib/nutrition.js'
import { startOfWeekISO, relativeTime } from '../../lib/dates.js'

// Pull the comparable stats for one user.
async function loadUserStats(userId, calorieGoal) {
  const weekStart = startOfWeekISO()
  const [gamRes, badgeRes, logRes] = await Promise.all([
    supabase
      .from('gamification')
      .select('weekly_xp, current_streak, level, updated_at')
      .eq('user_id', userId)
      .single(),
    supabase.from('badges').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('food_logs')
      .select('logged_date, calories')
      .eq('user_id', userId)
      .gte('logged_date', weekStart),
  ])

  const days = groupByDay(logRes.data || [])
  const goalsHit = [...days.values()].filter((d) => isGoalHit(d.calories, calorieGoal)).length

  return {
    weeklyXp: gamRes.data?.weekly_xp ?? 0,
    streak: gamRes.data?.current_streak ?? 0,
    level: gamRes.data?.level ?? 1,
    badges: badgeRes.count ?? 0,
    goalsHit,
    updatedAt: gamRes.data?.updated_at ?? null,
  }
}

export default function Battle() {
  const { user } = useAuth()
  const [me, setMe] = useState(null)
  const [partner, setPartner] = useState(null)
  const [myStats, setMyStats] = useState(null)
  const [partnerStats, setPartnerStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('display_name, calorie_goal, avatar_color, avatar_url, partner_id')
      .eq('id', user.id)
      .single()
    setMe(myProfile)
    setMyStats(await loadUserStats(user.id, myProfile?.calorie_goal ?? 2000))

    if (myProfile?.partner_id) {
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('display_name, calorie_goal, avatar_color, avatar_url')
        .eq('id', myProfile.partner_id)
        .single()
      setPartner({ id: myProfile.partner_id, ...partnerProfile })
      setPartnerStats(await loadUserStats(myProfile.partner_id, partnerProfile?.calorie_goal ?? 2000))
    } else {
      setPartner(null)
      setPartnerStats(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: refresh partner stats whenever their gamification row changes.
  useEffect(() => {
    if (!partner?.id) return
    const channel = supabase
      .channel(`battle-${partner.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gamification', filter: `user_id=eq.${partner.id}` },
        async () => {
          setPartnerStats(await loadUserStats(partner.id, partner.calorie_goal ?? 2000))
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [partner?.id, partner?.calorie_goal])

  async function connect(e) {
    e.preventDefault()
    setLinking(true)
    setLinkError(null)
    const { data, error } = await supabase.rpc('link_partner', { partner_email: email.trim() })
    setLinking(false)
    if (error) return setLinkError(error.message)
    if (!data?.ok) return setLinkError(data?.error || 'Could not link')
    setEmail('')
    setLoading(true)
    load()
  }

  async function disconnect() {
    await supabase.rpc('unlink_partner')
    setLoading(true)
    load()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 pt-6">
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <PageHeader title="Battle" subtitle="You vs. your partner this week" />

      {partner ? (
        <Versus
          me={me}
          myStats={myStats}
          partner={partner}
          partnerStats={partnerStats}
          onDisconnect={disconnect}
        />
      ) : (
        <ConnectPartner
          email={email}
          setEmail={setEmail}
          onSubmit={connect}
          linking={linking}
          error={linkError}
        />
      )}
    </div>
  )
}

function Versus({ me, myStats, partner, partnerStats, onDisconnect }) {
  const lead = myStats.weeklyXp - partnerStats.weeklyXp
  const total = myStats.weeklyXp + partnerStats.weeklyXp
  const myShare = total > 0 ? (myStats.weeklyXp / total) * 100 : 50

  // Each player's avatar color drives their half of the battle bar (and their
  // stats). If both picked the same color, nudge the partner to a contrasting
  // tone so the two sides stay distinguishable.
  const myColor = me?.avatar_color || '#cbfb45'
  let partnerColor = partner?.avatar_color || '#f4719c'
  if (partnerColor.toLowerCase() === myColor.toLowerCase()) partnerColor = '#f4719c'
  if (partnerColor.toLowerCase() === myColor.toLowerCase()) partnerColor = '#5cc8ff'

  const rows = [
    ['Weekly XP', myStats.weeklyXp, partnerStats.weeklyXp],
    ['Streak', `${myStats.streak}🔥`, `${partnerStats.streak}🔥`],
    ['Goals hit', myStats.goalsHit, partnerStats.goalsHit],
    ['Level', myStats.level, partnerStats.level],
    ['Badges', myStats.badges, partnerStats.badges],
  ]

  return (
    <>
      {/* Heads */}
      <div className="flex items-center justify-between">
        <Head profile={me} label="You" align="left" />
        <span className="text-sm font-bold text-slate-500">VS</span>
        <Head profile={partner} label={partner.display_name || 'Partner'} align="right" />
      </div>

      {/* Leaderboard bar */}
      <div className="mt-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
          <div className="transition-all duration-500" style={{ width: `${myShare}%`, backgroundColor: myColor }} />
          <div className="transition-all duration-500" style={{ width: `${100 - myShare}%`, backgroundColor: partnerColor }} />
        </div>
        <p className="mt-2 text-center text-sm font-semibold text-white">
          {lead === 0
            ? "You're tied!"
            : lead > 0
              ? `You're winning by ${lead} XP`
              : `${partner.display_name || 'Partner'} leads by ${-lead} XP`}
        </p>
      </div>

      {/* Stat comparison */}
      <div className="mt-5 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/5">
        {rows.map(([label, mine, theirs], i) => (
          <div
            key={label}
            className={`grid grid-cols-3 items-center px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}
          >
            <span className="text-left text-base font-bold" style={{ color: myColor }}>{mine}</span>
            <span className="text-center text-xs uppercase tracking-wide text-slate-500">{label}</span>
            <span className="text-right text-base font-bold" style={{ color: partnerColor }}>{theirs}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        {partner.display_name || 'Partner'} last active {relativeTime(partnerStats.updatedAt)}
      </p>

      <button
        onClick={onDisconnect}
        className="mt-5 w-full rounded-xl bg-surface-2 px-4 py-2.5 text-xs font-semibold text-slate-400 ring-1 ring-white/10 active:bg-white/5"
      >
        Disconnect partner
      </button>
    </>
  )
}

function Head({ profile, label, align }) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <div className={`mb-1 ${align === 'right' ? 'flex justify-end' : ''}`}>
        <Avatar url={profile?.avatar_url} color={profile?.avatar_color || '#cbfb45'} name={label} size={52} />
      </div>
      <p className="max-w-[7rem] truncate text-sm font-semibold text-white">{label}</p>
    </div>
  )
}

function ConnectPartner({ email, setEmail, onSubmit, linking, error }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-6 ring-1 ring-white/5">
      <div className="mb-3 text-center text-4xl">🤝</div>
      <h2 className="text-center text-lg font-bold text-white">Connect your partner</h2>
      <p className="mt-1 text-center text-sm text-slate-400">
        Enter your partner's CalTrack email to link up and start competing.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input
          type="email"
          inputMode="email"
          required
          placeholder="partner@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
        />
        {error && <p className="text-sm text-pink-300">{error}</p>}
        <button
          type="submit"
          disabled={linking}
          className="w-full rounded-xl bg-brand px-4 py-3 text-base font-semibold text-surface active:bg-brand-dark disabled:opacity-60"
        >
          {linking ? 'Connecting…' : 'Connect partner'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-600">
        Linking is instant and mutual — once connected, you'll both see each other here.
      </p>
    </div>
  )
}
