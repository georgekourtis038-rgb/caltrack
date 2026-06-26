import PageHeader from '../../components/PageHeader.jsx'

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Today" subtitle="Your daily calorie snapshot" />

      <section className="px-5">
        <div className="rounded-2xl bg-surface-2 p-5 shadow-lg ring-1 ring-white/5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-slate-400">Calories remaining</span>
            <span className="text-xs text-brand">Goal 2,000</span>
          </div>
          <p className="mt-1 text-4xl font-bold text-white">2,000</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-0 rounded-full bg-brand" />
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3 px-5">
        {[
          { label: 'Protein', value: '0g' },
          { label: 'Carbs', value: '0g' },
          { label: 'Fat', value: '0g' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-surface-2 p-3 text-center ring-1 ring-white/5">
            <p className="text-lg font-semibold text-white">{m.value}</p>
            <p className="text-xs text-slate-400">{m.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Today's log</h2>
        <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-slate-500 ring-1 ring-white/5">
          Nothing logged yet. Tap “Log” to add a meal.
        </p>
      </section>
    </div>
  )
}
