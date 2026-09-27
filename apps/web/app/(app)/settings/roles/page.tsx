import type { Metadata } from "next"

import { AccessDenied } from "@/components/app/access-denied"
import { PageHeader } from "@/components/app/page-header"
import { RoleMatrixTable } from "@/features/settings/role-matrix"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Roles" }

export default async function RolesPage() {
  const me = await requireMe()
  if (!can(me, "settings.manage")) return <AccessDenied title="Roles" permission="settings.manage" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="System roles and the permissions they grant. Preparers cannot approve and reviewers cannot prepare, keeping duties separate."
      />
      <RoleMatrixTable />
    </div>
  )
}
