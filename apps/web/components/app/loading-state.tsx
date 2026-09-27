import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Page-level skeleton mirroring PageHeader + content, so layout does not jump when data arrives. */
export function LoadingState({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-live="polite" aria-label="Loading">
      <div className="space-y-2 border-b pb-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
