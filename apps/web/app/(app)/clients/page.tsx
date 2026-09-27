import { Building2Icon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Clients" }

export default async function ClientsPage() {
  const me = await requireMe()
  if (!can(me, "clients.view")) return <AccessDenied title={"Clients"} permission="clients.view" />

  return (
    <PlannedFeature
      title="Clients"
      description="Taxpayers managed by your organisation, with registration and compliance status."
      icon={Building2Icon}
      emptyTitle="No clients yet"
      emptyDescription="Each client is a taxpayer with a registration profile (including VAT status sourced from their BIR Certificate of Registration), accounting connections and tax periods."
      phase={2}
    />
  )
}
