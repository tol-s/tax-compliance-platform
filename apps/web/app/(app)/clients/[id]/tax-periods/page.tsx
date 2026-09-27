import { CalendarRangeIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function TaxPeriodsTab() {
  return (
    <EmptyState
      icon={CalendarRangeIcon}
      title="No tax periods"
      description="Tax periods move through the filing workflow from open to finalised."
    />
  )
}
