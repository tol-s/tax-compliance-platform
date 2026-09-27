import { IdCardIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function TaxProfileTab() {
  return (
    <EmptyState
      icon={IdCardIcon}
      title="Tax profile"
      description="Registration information, VAT status and its source document, tax types, effective dates and history."
    />
  )
}
