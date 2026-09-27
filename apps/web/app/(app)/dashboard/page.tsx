import { ActivityIcon, Building2Icon, CalendarClockIcon, PlugIcon, ShieldAlertIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/app/empty-state"
import { MetricCard } from "@/components/app/metric-card"
import { PageHeader } from "@/components/app/page-header"
import { SectionCard } from "@/components/app/section-card"
import { Button } from "@/components/ui/button"
import { AuditTimeline } from "@/features/audit/audit-timeline"
import { apiFetch } from "@/lib/api/server"
import type { DashboardData } from "@/types/api"
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
  const { data } = await apiFetch<{ data: DashboardData }>("dashboard")
  const clients = data.clients
  const activity = data.recent_activity

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

      {/* Only figures computed from real records are shown. Modules not built yet
          (periods, calculations, exceptions) report nothing rather than a zero. */}
      {clients.total === 0 ? (
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
      ) : (
        <section aria-label="Compliance health" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Clients" value={clients.total} hint="Active taxpayers" href="/clients" />
          <MetricCard label="VAT registered" value={clients.vat_registered} hint="Registered status" href="/clients" />
          <MetricCard label="Non-VAT" value={clients.non_vat} hint="Registered status" href="/clients" />
          <MetricCard
            label="Registration unverified"
            value={clients.registration_unverified}
            hint="No supporting document on file"
            href="/clients"
            tone="warning"
          />
        </section>
      )}

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
        <SectionCard title="Recent activity" description="Changes across your organisation.">
          {activity && activity.length > 0 ? (
            <AuditTimeline events={activity} />
          ) : (
            <EmptyState
              bordered={false}
              icon={ActivityIcon}
              title={activity ? "No activity yet" : "Activity is visible to auditors"}
              description={
                activity
                  ? "Client changes, registration updates and uploads will appear here."
                  : "Your role does not include audit.view."
              }
            />
          )}
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
