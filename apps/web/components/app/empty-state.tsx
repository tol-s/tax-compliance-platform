import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  /** Explain why this is empty and what unlocks it. */
  description: ReactNode
  /** The next step, usually a single button or link. */
  action?: ReactNode
  /** Dashed outline for standalone use; turn off when nested inside a card. */
  bordered?: boolean
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, bordered = true, className }: EmptyStateProps) {
  return (
    <Empty className={cn(bordered ? "border border-dashed" : "p-4 md:p-6", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
