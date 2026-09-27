import { ScrollTextIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function AuditLogTab() {
  return (
    <EmptyState
      icon={ScrollTextIcon}
      title="Client audit log"
      description="Every change to this client, its registration, calculations and forms."
    />
  )
}
