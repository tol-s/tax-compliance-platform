import type { Metadata } from "next"

import { AccessDenied } from "@/components/app/access-denied"
import { PageHeader } from "@/components/app/page-header"
import { OrganizationAuditLog } from "@/features/audit/organization-audit-log"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Audit log" }

export default async function AuditPage() {
  const me = await requireMe()
  if (!can(me, "audit.view")) return <AccessDenied title="Audit log" permission="audit.view" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Append-only record of every important action in this organisation. Entries cannot be edited or deleted."
      />
      <OrganizationAuditLog />
    </div>
  )
}
