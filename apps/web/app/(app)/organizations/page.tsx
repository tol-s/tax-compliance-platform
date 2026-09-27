import type { Metadata } from "next"

import { PageHeader } from "@/components/app/page-header"
import { StatusBadge } from "@/components/app/status-badge"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireMe } from "@/lib/auth/me"

export const metadata: Metadata = { title: "Organisations" }

export default async function OrganizationsPage() {
  const me = await requireMe()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        description="Organisations you belong to. Switch between them from the menu at the bottom of the sidebar."
      />
      <div className="rounded-lg border">
        <Table>
          <TableCaption className="sr-only">Your organisation memberships</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Your role</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {me.memberships.map((membership) => (
              <TableRow
                key={membership.id}
                aria-current={membership.organization.id === me.organization?.id || undefined}
              >
                <TableCell className="font-medium">
                  {membership.organization.name}
                  {membership.organization.id === me.organization?.id ? (
                    <span className="text-muted-foreground ml-2 text-xs">(current)</span>
                  ) : null}
                  {membership.organization.is_demo ? (
                    <StatusBadge status="STAGING" label="Staging" tone="warning" className="ml-2" />
                  ) : null}
                </TableCell>
                <TableCell>{membership.role.name}</TableCell>
                <TableCell className="font-mono text-xs">{membership.organization.country_code}</TableCell>
                <TableCell className="font-mono text-xs">{membership.organization.base_currency}</TableCell>
                <TableCell>
                  <StatusBadge status={membership.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
