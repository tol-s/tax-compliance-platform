import { TriangleAlertIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/reui/alert"

export interface ErrorStateProps {
  title?: string
  description?: ReactNode
  /** Shown so users can quote it to support; links the UI error to server logs. */
  correlationId?: string
  action?: ReactNode
}

export function ErrorState({
  title = "Something went wrong",
  description = "The request could not be completed. Try again, and contact support if the problem persists.",
  correlationId,
  action,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {description}
        {correlationId ? (
          <span className="text-muted-foreground mt-1 block font-mono text-xs">Reference: {correlationId}</span>
        ) : null}
      </AlertDescription>
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  )
}
