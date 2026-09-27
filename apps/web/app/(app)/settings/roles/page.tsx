import { ShieldCheckIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Roles" }

export default async function SettingsRolesPage() {
  const me = await requireMe()
  if (!can(me, "settings.manage")) return <AccessDenied title={"Roles"} permission="settings.manage" />

  return (
    <PlannedFeature
      title="Roles"
      description="Roles and the permissions they grant."
      icon={ShieldCheckIcon}
      emptyTitle="Role management"
      emptyDescription="System roles (Owner, Admin, Tax Manager, Tax Preparer, Reviewer, Accountant, Read Only) are active now. Viewing the permission matrix and custom roles arrive with user management."
      phase={2}
    />
  )
}
