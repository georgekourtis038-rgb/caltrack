function Box({ className }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className}`} />
}

/**
 * Loading placeholder that mirrors the Dashboard layout.
 */
export default function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <Box className="h-6 w-40" />

      <div className="mt-4 grid grid-cols-3 gap-3">
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
    </div>
  )
}
