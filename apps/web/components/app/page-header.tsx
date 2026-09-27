import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  title: string
  /** One line of context: what this screen is for, or which taxpayer/period it concerns. */
  description?: ReactNode
  /** Status indicator shown next to the title (e.g. a StatusBadge). */
  status?: ReactNode
  /** The screen's primary action. Keep to one; secondary actions go in a menu. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, status, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          {status}
        </div>
        {description ? <p className="text-muted-foreground max-w-3xl text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
