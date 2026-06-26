import PageHeader from '../../components/PageHeader.jsx'

export default function Profile() {
  const rows = [
    { label: 'Daily calorie goal', value: '2,000' },
    { label: 'Partner', value: 'Not linked' },
    { label: 'Units', value: 'Metric' },
    { label: 'Notifications', value: 'On' },
  ]

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Profile" />

      <section className="px-5">
        <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/20 text-xl font-bold text-brand">
            🙂
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Your name</p>
            <p className="text-sm text-slate-400">Signed out</p>
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-slate-300">{r.label}</span>
              <span className="text-sm text-slate-500">{r.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 px-5">
        <button className="w-full rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-pink-400 ring-1 ring-white/10 active:bg-white/5">
          Sign in
        </button>
      </section>
    </div>
  )
}
