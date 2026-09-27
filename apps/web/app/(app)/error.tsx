"use client"

import { ErrorState } from "@/components/app/error-state"
import { Button } from "@/components/ui/button"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="This page could not be loaded"
      description="Your data is safe. Retry, or contact support quoting the reference below."
      correlationId={error.digest}
      action={
        <Button size="sm" variant="outline" onClick={reset}>
          Retry
        </Button>
      }
    />
  )
}
