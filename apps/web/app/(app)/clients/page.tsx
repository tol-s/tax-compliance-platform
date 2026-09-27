import type { Metadata } from "next"

import { AccessDenied } from "@/components/app/access-denied"
import { PageHeader } from "@/components/app/page-header"
import { ClientsTable } from "@/features/clients/clients-table"
import { CreateClientSheet } from "@/features/clients/create-client-sheet"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Clients" }

export default async function ClientsPage() {
  const me = await requireMe()
  if (!can(me, "clients.view")) return <AccessDenied title="Clients" permission="clients.view" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Taxpayers managed by your organisation, with their registered VAT status and its source."
      />
      <ClientsTable createAction={can(me, "clients.create") ? <CreateClientSheet /> : undefined} />
    </div>
  )
}
