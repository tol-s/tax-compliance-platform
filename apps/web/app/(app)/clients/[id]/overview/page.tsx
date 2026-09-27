import { LayoutDashboardIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function OverviewTab() {
  return (
    <EmptyState
      icon={LayoutDashboardIcon}
      title="Client overview"
      description="Registration status, accounting connection, current tax period and compliance status."
    />
  )
}
