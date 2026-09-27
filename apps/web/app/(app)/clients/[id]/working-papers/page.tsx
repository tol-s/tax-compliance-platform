import { FileSpreadsheetIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function WorkingPapersTab() {
  return (
    <EmptyState
      icon={FileSpreadsheetIcon}
      title="No working papers"
      description="Working papers are generated from calculations and are versioned and exportable."
    />
  )
}
