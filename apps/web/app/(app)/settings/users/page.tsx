import type { Metadata } from "next"

import { AccessDenied } from "@/components/app/access-denied"
import { PageHeader } from "@/components/app/page-header"
import { AddMemberDialog, MembersTable } from "@/features/settings/members"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Users" }

export default async function UsersPage() {
  const me = await requireMe()
  if (!can(me, "settings.manage")) return <AccessDenied title="Users" permission="settings.manage" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="People in this organisation, their roles and access. Every change is audited."
        actions={<AddMemberDialog />}
      />
      <MembersTable />
    </div>
  )
}
