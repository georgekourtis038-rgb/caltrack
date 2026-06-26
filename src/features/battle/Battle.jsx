import PageHeader from '../../components/PageHeader.jsx'

export default function Battle() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Battle" subtitle="You vs. your partner — today's standings" />

      <section className="px-5">
        <div className="rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <Player name="You" score={0} align="left" />
            <span className="px-3 text-sm font-bold text-slate-500">VS</span>
            <Player name="Partner" score={0} align="right" />
          </div>

          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-white/10">
            <div className="bg-brand" style={{ width: '50%' }} />
            <div className="bg-pink-500" style={{ width: '50%' }} />
          </div>
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">This week</h2>
        <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-slate-500 ring-1 ring-white/5">
          Win days by staying within your goal. Standings update as you both log.
        </p>
      </section>
    </div>
  )
}

function Player({ name, score, align }) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="text-sm text-slate-400">{name}</p>
      <p className="text-3xl font-bold text-white">{score}</p>
    </div>
  )
}
