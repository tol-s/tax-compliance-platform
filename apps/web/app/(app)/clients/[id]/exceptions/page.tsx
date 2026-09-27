import { ShieldAlertIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function ExceptionsTab() {
  return (
    <EmptyState
      icon={ShieldAlertIcon}
      title="No exceptions"
      description="Missing data, unmapped accounts, threshold advisories and anomalies for this client."
    />
  )
}
