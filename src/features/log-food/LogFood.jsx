import PageHeader from '../../components/PageHeader.jsx'

export default function LogFood() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Log Food" subtitle="Search, scan, or snap a photo" />

      <section className="px-5">
        <input
          type="search"
          inputMode="search"
          placeholder="Search foods…"
          className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
        />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 px-5">
        <button className="rounded-xl bg-brand px-4 py-4 text-sm font-semibold text-surface active:bg-brand-dark">
          📷 Photo (AI)
        </button>
        <button className="rounded-xl bg-surface-2 px-4 py-4 text-sm font-semibold text-white ring-1 ring-white/10 active:bg-white/5">
          🔢 Barcode
        </button>
      </section>

      <section className="mt-6 px-5">
        <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-slate-500 ring-1 ring-white/5">
          Search results from Open Food Facts will appear here.
        </p>
      </section>
    </div>
  )
}
