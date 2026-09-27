import { BarChart3Icon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"
import { ReportsPreview, loadPreviewClients } from "@/features/preview/components"

export const metadata: Metadata = { title: "Reports" }

export default async function ReportsPage() {
  const me = await requireMe()
  if (!can(me, "clients.view")) return <AccessDenied title={"Reports"} permission="clients.view" />
  if (me.organization?.is_demo) return <ReportsPreview clients={await loadPreviewClients()} />

  return (
    <PlannedFeature
      title="Reports"
      description="Tax, revenue, VAT and non-VAT summaries, liabilities, exceptions and audit reports."
      icon={BarChart3Icon}
      emptyTitle="No report data"
      emptyDescription="Reports are built from finalised and in-progress calculations. They appear once clients have calculated tax periods, with CSV, XLSX and PDF export."
      phase={9}
    />
  )
}
