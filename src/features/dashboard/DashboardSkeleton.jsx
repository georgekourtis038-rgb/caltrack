function Box({ className }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className}`} />
}

/**
 * Loading placeholder that mirrors the Dashboard layout. `compact` omits the
 * outer padding + title (used when the day navigator already renders above it).
 */
export default function DashboardSkeleton({ compact = false }) {
  const body = (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Box className="h-20" />
        <Box className="h-20" />
        <Box className="h-20" />
      </div>

      <div className="mt-6 flex justify-center">
        <div className="h-56 w-56 animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="mt-6 space-y-3 rounded-2xl bg-surface-2 p-4 ring-1 ring-white/5">
        <Box className="h-2 w-full" />
        <Box className="h-2 w-full" />
        <Box className="h-2 w-full" />
      </div>

      <div className="mt-6 space-y-2">
        <Box className="h-4 w-24" />
        <Box className="h-16 w-full" />
        <Box className="h-16 w-full" />
      </div>
    </>
  )

  if (compact) return <div className="pt-1">{body}</div>
  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <Box className="mb-4 h-6 w-40" />
      {body}
    </div>
  )
}
