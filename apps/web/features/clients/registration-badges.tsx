import { ShieldAlertIcon, ShieldCheckIcon } from "lucide-react"

import { StatusBadge } from "@/components/app/status-badge"
import type { RegistrationStatus } from "@/types/api"

/** Registered VAT status as recorded, never as inferred. */
export function VatStatusBadge({ registration }: { registration: RegistrationStatus | null | undefined }) {
  if (!registration) return <StatusBadge status="NOT_RECORDED" label="Not recorded" tone="warning" />
  return <StatusBadge status={registration.vat_status} />
}

/** Whether the recorded status is backed by an uploaded source document. */
export function VerificationIndicator({ registration }: { registration: RegistrationStatus | null | undefined }) {
  if (!registration) return null
  return registration.verified ? (
    <span className="text-success-foreground inline-flex items-center gap-1 text-xs">
      <ShieldCheckIcon className="size-3.5" aria-hidden /> Document on file
    </span>
  ) : (
    <span className="text-warning-foreground inline-flex items-center gap-1 text-xs">
      <ShieldAlertIcon className="size-3.5" aria-hidden /> No supporting document
    </span>
  )
}
