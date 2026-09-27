import { DatabaseIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function AccountingTab() {
  return (
    <EmptyState
      icon={DatabaseIcon}
      title="No accounting data"
      description="Connect Xero or QuickBooks Online, then explore normalised accounting records with full source lineage."
    />
  )
}
