import { format, formatDistanceToNowStrict, parseISO } from "date-fns"

/** Dates are shown unambiguously (27 Sep 2026): day-month order confuses nobody. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "–"
  return format(parseISO(value), "d MMM yyyy")
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "–"
  return format(parseISO(value), "d MMM yyyy, HH:mm")
}

export function formatRelative(value: string): string {
  return `${formatDistanceToNowStrict(parseISO(value))} ago`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? String(month)
}

export const monthOptions = MONTHS.map((label, index) => ({ value: String(index + 1), label }))

/** Human wording for audit actions; unknown actions fall back to the raw key. */
const ACTIONS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.login_failed": "Failed sign-in",
  "organization.created": "Organisation created",
  "organization.switched": "Switched organisation",
  "client.created": "Client created",
  "client.updated": "Client details updated",
  "client.assignments_changed": "Team assignments changed",
  "taxpayer_profile.updated": "Tax profile updated",
  "registration_status.recorded": "Registration status recorded",
  "registration_status.changed": "Registration status changed",
  "document.uploaded": "Document uploaded",
  "document.downloaded": "Document downloaded",
  "membership.created": "Member added",
  "membership.updated": "Member updated",
}

export function auditActionLabel(action: string): string {
  return ACTIONS[action] ?? action
}
