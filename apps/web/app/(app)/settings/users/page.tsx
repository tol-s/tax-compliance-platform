import { UsersIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Users" }

export default async function SettingsUsersPage() {
  const me = await requireMe()
  if (!can(me, "settings.manage")) return <AccessDenied title={"Users"} permission="settings.manage" />

  return (
    <PlannedFeature
      title="Users"
      description="People in this organisation and their roles."
      icon={UsersIcon}
      emptyTitle="User management"
      emptyDescription="Invite users, assign roles and restrict preparers to their assigned clients. Membership changes are audited."
      phase={2}
    />
  )
}
