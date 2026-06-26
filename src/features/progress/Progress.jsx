import PageHeader from '../../components/PageHeader.jsx'

export default function Progress() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Progress" subtitle="Trends and streaks over time" />

      <section className="px-5">
        <div className="flex h-48 items-end justify-between gap-1 rounded-2xl bg-surface-2 p-4 ring-1 ring-white/5">
          {[40, 65, 50, 80, 35, 70, 55].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-brand/70" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between px-1 text-[10px] text-slate-500">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="flex-1 text-center">{d}</span>
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 px-5">
        <div className="rounded-xl bg-surface-2 p-4 ring-1 ring-white/5">
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-slate-400">Day streak</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-4 ring-1 ring-white/5">
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-slate-400">Avg / day</p>
        </div>
      </section>
    </div>
  )
}
