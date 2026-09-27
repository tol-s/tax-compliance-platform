import { ActivityIcon, Building2Icon, CalendarClockIcon, PlugIcon, ShieldAlertIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { SectionCard } from "@/components/app/section-card"
import { Button } from "@/components/ui/button"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Dashboard" }

/** The filing workflow every tax period follows. A process guide, not progress data. */
const WORKFLOW = [
  "Select taxpayer",
  "Select tax period",
  "Verify registration profile",
  "Sync accounting data",
  "Review accounting completeness",
  "Run classification",
  "Run tax calculation",
  "Detect exceptions",
  "Review calculation",
  "Generate working papers",
  "Generate tax forms",
  "Review forms",
  "Approve",
  "Finalise",
]

export default async function DashboardPage() {
  const me = await requireMe()
  const canCreateClients = can(me, "clients.create")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Compliance overview for ${me.organization?.name ?? "your organisation"}.`}
        actions={
          canCreateClients ? (
            <Button asChild size="sm">
              <Link href="/clients">Add client</Link>
            </Button>
          ) : null
        }
      />

      {/* Metrics are computed from real client, period and exception data. With no
          clients there is nothing to measure, so no numbers are shown. */}
      <SectionCard title="Compliance health" description="Clients, tax periods in progress, reviews and exceptions.">
        <EmptyState
          bordered={false}
          icon={Building2Icon}
          title="No clients yet"
          description="Add your first taxpayer and record their registration details. Compliance health, deadlines and review queues appear here once tax periods exist."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/clients">Go to clients</Link>
            </Button>
          }
        />
      </SectionCard>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <SectionCard title="Exceptions requiring attention" className="xl:col-span-2">
          <EmptyState
            bordered={false}
            icon={ShieldAlertIcon}
            title="No open exceptions"
            description="Missing data, unmapped accounts, threshold advisories and calculation anomalies will be listed here, highest severity first."
          />
        </SectionCard>
        <SectionCard title="Upcoming obligations">
          <EmptyState
            bordered={false}
            icon={CalendarClockIcon}
            title="No obligations scheduled"
            description="Filing deadlines are derived from each client's tax periods."
          />
        </SectionCard>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <SectionCard title="Integration status">
          <EmptyState
            bordered={false}
            icon={PlugIcon}
            title="No accounting connections"
            description="Connect a client to Xero or QuickBooks Online to import accounting data."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/integrations">View integrations</Link>
              </Button>
            }
          />
        </SectionCard>
        <SectionCard title="Recent activity" description="Calculations, generated forms and imports.">
          <EmptyState
            bordered={false}
            icon={ActivityIcon}
            title="No activity yet"
            description="Completed calculations, generated forms and failed imports will appear here."
          />
        </SectionCard>
        <SectionCard title="Tax filing workflow" description="The steps every tax period moves through.">
          <ol className="text-sm">
            {WORKFLOW.map((step, index) => (
              <li key={step} className="flex items-center gap-3 border-b py-1.5 last:border-b-0">
                <span className="text-muted-foreground w-5 text-right font-mono text-xs tabular-nums">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    </div>
  )
}
