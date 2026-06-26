export default function PageHeader({ title, subtitle }) {
  return (
    <header className="px-5 pb-2 pt-6">
      <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </header>
  )
}
