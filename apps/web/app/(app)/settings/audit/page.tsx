import { ScrollTextIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Audit log" }

export default async function SettingsAuditPage() {
  const me = await requireMe()
  if (!can(me, "audit.view")) return <AccessDenied title={"Audit log"} permission="audit.view" />

  return (
    <PlannedFeature
      title="Audit log"
      description="Append-only record of every important action in this organisation."
      icon={ScrollTextIcon}
      emptyTitle="Audit log viewer"
      emptyDescription="Sign-ins, organisation switches and every change are already being recorded, append-only, with actor, before and after values and correlation IDs. The searchable viewer arrives with client management."
      phase={2}
    />
  )
}
