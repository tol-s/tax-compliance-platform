import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"

/**
 * One status language for the whole product. Every domain enum that is shown
 * to users maps to a tone here, so "REVIEW REQUIRED" looks the same on the
 * dashboard, the tax period list and the form review screen.
 */
export type StatusTone = "success" | "warning" | "destructive" | "info" | "neutral" | "locked"

const toneVariant = {
  success: "success-light",
  warning: "warning-light",
  destructive: "destructive-light",
  info: "info-light",
  neutral: "outline",
  locked: "invert",
} as const

const STATUS_TONES: Record<string, StatusTone> = {
  // Workflow
  OPEN: "neutral",
  DRAFT: "neutral",
  DATA_SYNC_REQUIRED: "warning",
  DATA_READY: "info",
  READY: "success",
  CALCULATING: "info",
  CALCULATED: "info",
  REVIEW_REQUIRED: "warning",
  EXCEPTIONS: "destructive",
  EXCEPTION: "destructive",
  READY_FOR_APPROVAL: "info",
  APPROVED: "success",
  FINALIZED: "locked",
  FAILED: "destructive",
  // Integrations
  CONNECTED: "success",
  SYNCING: "info",
  SYNCED: "success",
  ERROR: "destructive",
  DISCONNECTED: "neutral",
  TOKEN_EXPIRED: "warning",
  SIMULATOR: "warning",
  // Thresholds
  BELOW_THRESHOLD: "success",
  APPROACHING_THRESHOLD: "warning",
  CROSSED_THRESHOLD: "destructive",
  // Registration
  VAT_REGISTERED: "info",
  NON_VAT: "neutral",
  // Exceptions
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "destructive",
  RESOLVED: "success",
  // Rules and forms
  PUBLISHED: "success",
  RETIRED: "neutral",
  // Memberships
  ACTIVE: "success",
  INVITED: "info",
  SUSPENDED: "warning",
}

export function statusTone(status: string): StatusTone {
  return STATUS_TONES[status.toUpperCase()] ?? "neutral"
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toUpperCase().replace("NON VAT", "NON-VAT")
}

export interface StatusBadgeProps {
  status: string
  /** Override the default label, e.g. for localisation. */
  label?: string
  tone?: StatusTone
  className?: string
}

export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  const resolved = tone ?? statusTone(status)

  return (
    <Badge
      variant={toneVariant[resolved]}
      data-status={status}
      data-tone={resolved}
      className={cn("font-medium tracking-wide uppercase", className)}
    >
      {label ?? statusLabel(status)}
    </Badge>
  )
}
