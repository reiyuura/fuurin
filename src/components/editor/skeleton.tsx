/**
 * Editor skeleton — loading placeholder for editor pages.
 */

export function EditSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-48 rounded-xl bg-hover" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="h-40 rounded-xl bg-hover" />
            <div className="h-4 w-3/4 rounded bg-hover" />
            <div className="h-3 w-1/2 rounded bg-hover" />
          </div>
        ))}
      </div>
    </div>
  )
}