import { InfoIcon } from "lucide-react"
import type { Metadata } from "next"

import { AccessDenied } from "@/components/app/access-denied"
import { MetricCard } from "@/components/app/metric-card"
import { PageHeader } from "@/components/app/page-header"
import { SectionCard } from "@/components/app/section-card"
import { BreakdownBars, MonthlyColumns } from "@/features/analytics/charts"
import { apiFetch } from "@/lib/api/server"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"
import type { ActivityCategory, AnalyticsData } from "@/types/api"

export const metadata: Metadata = { title: "Analytics" }

const ACTIVITY_LABELS: Record<ActivityCategory, string> = {
  clients: "Clients",
  registration: "Registration and profile",
  documents: "Documents",
  team: "Team and settings",
  sign_ins: "Sign-ins",
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export default async function AnalyticsPage() {
  const me = await requireMe()
  if (!can(me, "clients.view")) return <AccessDenied title="Analytics" permission="clients.view" />

  const { data } = await apiFetch<{ data: AnalyticsData }>("analytics")
  const { months, clients, registrations, documents, activity, workload } = data
  const vatRegistered = clients.by_vat_status.find((item) => item.key === "VAT_REGISTERED")?.count ?? 0
  const scope = data.scope === "organization" ? "all clients in your organisation" : "the clients assigned to you"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Trends over the last 12 months for ${scope}. Months follow Philippine time.`}
      />

      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clients" value={clients.total} hint={`${clients.active} active`} href="/clients" />
        <MetricCard label="VAT registered" value={vatRegistered} hint="Current registered status" href="/clients" />
        <MetricCard label="Documents on file" value={documents.total} hint="Certificates and supporting files" />
        <MetricCard
          label="Registration changes"
          value={sum(registrations.changes_by_month)}
          hint="Evidenced changes, last 12 months"
        />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <SectionCard title="New clients" description="Clients added each month.">
          <MonthlyColumns
            months={months}
            caption="New clients per month"
            series={[{ key: "added", label: "Clients added", values: clients.added_by_month }]}
          />
        </SectionCard>
        <SectionCard
          title="Registration records"
          description="First registrations recorded, and evidenced changes to an existing registration."
        >
          <MonthlyColumns
            months={months}
            caption="Registration records per month"
            series={[
              { key: "initial", label: "First recorded", values: registrations.initial_by_month },
              { key: "changes", label: "Changes", values: registrations.changes_by_month },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <SectionCard title="VAT status" description="Each client's current registered status.">
          <BreakdownBars items={clients.by_vat_status} caption="Clients by VAT status" unit="clients" />
        </SectionCard>
        <SectionCard title="Evidence behind the status" description="Where each current status came from.">
          <BreakdownBars
            items={clients.by_registration_source}
            caption="Clients by registration source"
            unit="clients"
          />
        </SectionCard>
        <SectionCard title="Entity types">
          <BreakdownBars items={clients.by_entity_type} caption="Clients by entity type" unit="clients" />
        </SectionCard>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <SectionCard title="Documents by type">
          <BreakdownBars items={documents.by_kind} caption="Documents by type" unit="documents" />
        </SectionCard>
        <SectionCard title="Documents uploaded" description="Files added each month." className="lg:col-span-2">
          <MonthlyColumns
            months={months}
            caption="Documents uploaded per month"
            series={[{ key: "uploaded", label: "Documents", values: documents.uploaded_by_month }]}
          />
        </SectionCard>
      </div>

      {activity ? (
        <div className="grid items-start gap-6 xl:grid-cols-3">
          <SectionCard
            title="Team activity"
            description="Audited events each month, by area of work."
            className="xl:col-span-2"
          >
            <MonthlyColumns
              months={months}
              caption="Audited events per month by category"
              series={(Object.keys(ACTIVITY_LABELS) as ActivityCategory[]).map((key) => ({
                key,
                label: ACTIVITY_LABELS[key],
                values: activity.by_month.map((row) => row[key]),
              }))}
            />
          </SectionCard>
          <SectionCard
            title="Most active members"
            description="Recorded actions in the last 90 days, excluding sign-ins."
          >
            <BreakdownBars
              items={activity.by_member_90_days.map((row) => ({ key: row.name, label: row.name, count: row.count }))}
              caption="Recorded actions per member in the last 90 days"
              unit="actions"
            />
          </SectionCard>
        </div>
      ) : null}

      {activity || workload ? (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {activity ? (
            <SectionCard title="Active members" description="Members who signed in at least once each month.">
              <MonthlyColumns
                months={months}
                caption="Active members per month"
                series={[{ key: "members", label: "Active members", values: activity.active_members_by_month }]}
              />
            </SectionCard>
          ) : null}
          {workload ? (
            <SectionCard
              title="Workload"
              description="Clients assigned to members who only see their assigned clients."
            >
              <BreakdownBars
                items={workload.map((row) => ({
                  key: row.user_id,
                  label: `${row.name} · ${row.role}`,
                  count: row.assigned_clients,
                }))}
                caption="Assigned clients per member"
                unit="clients"
              />
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      <p className="text-muted-foreground flex items-start gap-2 text-xs">
        <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        Tax figures such as liabilities, VAT payable and filing status are added here once tax periods and calculations
        are in use. Nothing on this page is estimated.
      </p>
    </div>
  )
}
