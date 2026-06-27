export default function PageHeader({ title, subtitle }) {
  return (
    <header className="px-5 pb-2 pt-6">
      <h1 className="font-display text-[28px] font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  )
}
