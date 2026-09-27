import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"

export interface PlannedFeatureProps {
  title: string
  description: string
  icon: LucideIcon
  emptyTitle: string
  /** What this screen will show, and what must exist first. Never a fabricated preview. */
  emptyDescription: ReactNode
  action?: ReactNode
  /** Implementation phase from docs/IMPLEMENTATION_PLAN.md, shown for transparency. */
  phase: number
}

/**
 * Honest placeholder for a route whose backend has not been built yet. It
 * shows the page's purpose and what unlocks it, and never invents data.
 */
export function PlannedFeature({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  action,
  phase,
}: PlannedFeatureProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={
          <>
            {emptyDescription}
            <span className="text-muted-foreground mt-2 block text-xs">Delivered in implementation phase {phase}.</span>
          </>
        }
        action={action}
      />
    </div>
  )
}
