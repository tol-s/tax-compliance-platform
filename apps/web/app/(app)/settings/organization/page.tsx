import type { Metadata } from "next"

import { AccessDenied } from "@/components/app/access-denied"
import { PageHeader } from "@/components/app/page-header"
import { SectionCard } from "@/components/app/section-card"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Organisation settings" }

export default async function OrganizationSettingsPage() {
  const me = await requireMe()
  if (!can(me, "settings.manage")) return <AccessDenied title="Organisation settings" permission="settings.manage" />

  const organization = me.organization!
  const rows: [string, string][] = [
    ["Name", organization.name],
    ["Identifier", organization.slug],
    ["Country", organization.country_code],
    ["Base currency", organization.base_currency],
    ["Environment", organization.is_demo ? "Demo (fictional data)" : "Live"],
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Organisation settings" description="Details of the organisation you are signed in to." />
      <SectionCard
        title="Organisation"
        description="Editing organisation details arrives with user management (phase 2)."
      >
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[12rem_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  )
}
