import { FileTextIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function FormsTab() {
  return (
    <EmptyState
      icon={FileTextIcon}
      title="No forms"
      description="Forms are populated automatically from calculations, with provenance for every field."
    />
  )
}
