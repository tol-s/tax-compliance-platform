import { EyeIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { PageHeader } from "@/components/app/page-header"
import { SectionCard } from "@/components/app/section-card"
import { StatusBadge } from "@/components/app/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BreakdownBars, MonthlyColumns } from "@/features/analytics/charts"
import { apiFetch } from "@/lib/api/server"
import { formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Client, Paginated } from "@/types/api"

import {
  CLASSIFICATIONS,
  EXCEPTION_TEMPLATES,
  EXPERT_INPUT,
  FORM_DEFINITIONS,
  FORM_SECTIONS,
  QUARTERS,
  RULES,
  RULE_SETS,
  RULE_VERSIONS,
  SYNC_ENTITIES,
  TEST_SCENARIOS,
  peso,
  sampleConnections,
  samplePeriods,
  sampleSyncRuns,
  seeded,
  taxTypeFor,
} from "./data"

/* ----------------------------------------------------------------- shared */

export async function loadPreviewClients(): Promise<Client[]> {
  return (await apiFetch<Paginated<Client>>("clients?per_page=100")).data
}

export async function loadPreviewClient(id: string): Promise<Client> {
  return (await apiFetch<{ data: Client }>(`clients/${id}`)).data
}

const isVat = (client: Client) => client.current_registration?.vat_status === "VAT_REGISTERED"

export function PreviewNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "bg-muted/50 text-foreground flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-xs",
        className
      )}
    >
      <EyeIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <strong className="font-semibold">Design preview</strong> · sample content to show the layout. Not real tax
        rules, rates or BIR form fields; values marked &ldquo;{EXPERT_INPUT}&rdquo; come from the tax expert.
      </span>
    </div>
  )
}

type Cell = ReactNode
export function DataTable({
  columns,
  rows,
  numeric = [],
}: {
  columns: string[]
  rows: Cell[][]
  /** Column indexes that hold numbers (right-aligned, tabular). */
  numeric?: number[]
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={column} className={cn(numeric.includes(index) && "text-right")}>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, r) => (
            <TableRow key={r}>
              {row.map((cell, index) => (
                <TableCell key={index} className={cn(numeric.includes(index) && "text-right tabular-nums")}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div> : null}
    </div>
  )
}

function Stats({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

function Expert() {
  return <span className="text-muted-foreground italic">{EXPERT_INPUT}</span>
}

function Page({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        status={<StatusBadge status="PREVIEW" label="Preview" tone="warning" />}
      />
      <PreviewNotice />
      {children}
    </div>
  )
}

/** Illustrative computation lines. Credits use a random share so no rate is implied. */
function computation(seed: string, p: { sales: number; purchases: number; taxDue: number }) {
  const rand = seeded(`${seed}-lines`)
  const base = Math.round(p.sales * (0.84 + rand() * 0.12))
  const credits = Math.round(p.purchases * (0.04 + rand() * 0.1))
  return { base, credits, tax: p.taxDue + credits, payable: p.taxDue }
}

/** A date in the month after the quarter closes; the open quarter uses a recent September date instead. */
function workDate(p: { key: string; due: string }, day: string) {
  return p.key === "2026-Q3" ? `2026-09-${String(Number(day) + 10)}` : p.due.replace(/-\d\d$/, `-${day}`)
}

const MONTHS = [
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
]
const count = (rand: () => number, min: number, max: number) => Math.round(min + rand() * (max - min))

/* ---------------------------------------------------------------- reports */

export function ReportsPreview({ clients }: { clients: Client[] }) {
  const periods = clients.map((client) => ({ client, periods: samplePeriods(client.id, isVat(client)) }))
  const latest = periods.map((p) => ({ client: p.client, period: p.periods[p.periods.length - 1] }))
  const rand = seeded("reports")
  const byStatus = new Map<string, number>()
  for (const { period } of latest) byStatus.set(period.status, (byStatus.get(period.status) ?? 0) + 1)
  const totalSales = periods.reduce((sum, p) => sum + p.periods.reduce((a, b) => a + b.sales, 0), 0)
  const totalDue = periods.reduce((sum, p) => sum + p.periods.reduce((a, b) => a + b.taxDue, 0), 0)
  const openExceptions = latest.reduce((sum, l) => sum + l.period.exceptions, 0)

  return (
    <Page
      title="Reports"
      description="Tax, revenue, VAT and non-VAT summaries, liabilities, exceptions and audit reports."
    >
      <Stats>
        <Stat label="Sales reported (4 quarters)" value={peso(totalSales)} hint="Across all clients" />
        <Stat label="Tax payable (4 quarters)" value={peso(totalDue)} hint="Illustrative amounts" />
        <Stat
          label="Periods finalised"
          value={periods.length * 2 + (byStatus.get("FINALIZED") ?? 0)}
          hint="Locked and versioned"
        />
        <Stat label="Open exceptions" value={openExceptions} hint="Current quarter" />
      </Stats>
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <SectionCard
          title="Periods by month"
          description="Tax periods finalised and approved each month."
          className="xl:col-span-2"
        >
          <MonthlyColumns
            months={MONTHS}
            caption="Sample periods finalised and approved per month"
            series={[
              {
                key: "finalised",
                label: "Finalised",
                values: MONTHS.map((m) =>
                  ["01", "04", "07"].includes(m.slice(5)) ? count(rand, 14, 22) : count(rand, 0, 4)
                ),
              },
              { key: "approved", label: "Approved", values: MONTHS.map(() => count(rand, 1, 6)) },
            ]}
          />
        </SectionCard>
        <SectionCard title="Current quarter status" description={`${QUARTERS[3].label}, by client.`}>
          <BreakdownBars
            caption="Current quarter periods by status"
            unit="clients"
            items={[...byStatus.entries()].map(([key, value]) => ({
              key,
              label: key
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/^./, (c) => c.toUpperCase()),
              count: value,
            }))}
          />
        </SectionCard>
      </div>
      <SectionCard title="Tax liability summary" description="Latest quarter per client. Export as CSV, XLSX or PDF.">
        <DataTable
          columns={["Client", "Tax type", "Period", "Sales", "Purchases", "Tax payable", "Status"]}
          numeric={[3, 4, 5]}
          rows={latest.map(({ client, period }) => [
            <Link key="c" href={`/clients/${client.id}/tax-periods`} className="font-medium hover:underline">
              {client.legal_name}
            </Link>,
            period.taxType,
            period.label,
            peso(period.sales),
            peso(period.purchases),
            peso(period.taxDue),
            <StatusBadge key="s" status={period.status} />,
          ])}
        />
      </SectionCard>
    </Page>
  )
}

/* ------------------------------------------------------------- tax engine */

export function TaxEnginePreview() {
  return (
    <Page
      title="Tax engine"
      description="Jurisdictions, tax types, rule sets, versions, classifications and thresholds."
    >
      <Stats>
        <Stat label="Jurisdiction" value="PH" hint="Philippines" />
        <Stat label="Rule sets" value={RULE_SETS.length} hint="Published and draft" />
        <Stat
          label="Drafts awaiting review"
          value={RULE_SETS.filter((s) => s.draft).length}
          hint="Need expert sign-off"
        />
        <Stat
          label="Test scenarios"
          value={TEST_SCENARIOS.length}
          hint={`${TEST_SCENARIOS.filter((t) => t.status === "FAILED").length} failing`}
        />
      </Stats>
      <SectionCard
        title="Rule sets"
        description="Selected per taxpayer by registered status. Status is never changed automatically."
      >
        <DataTable
          columns={["Code", "Name", "Tax type", "Applies when", "Published", "Draft", "Rules"]}
          numeric={[6]}
          rows={RULE_SETS.map((s) => [
            <span key="c" className="font-mono text-xs">
              {s.code}
            </span>,
            s.name,
            s.taxType,
            <span key="w" className="font-mono text-xs">
              {s.selector}
            </span>,
            <StatusBadge key="p" status="PUBLISHED" label={`v${s.published}`} />,
            s.draft ? (
              <StatusBadge key="d" status="DRAFT" label={`v${s.draft}`} />
            ) : (
              <span key="d" className="text-muted-foreground">
                None
              </span>
            ),
            s.rules,
          ])}
        />
      </SectionCard>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <SectionCard title="Classifications" description="Buckets that accounts and transactions map into.">
          <div className="flex flex-wrap gap-2">
            {CLASSIFICATIONS.map((c) => (
              <span key={c} className="rounded-md border px-2 py-1 text-xs">
                {c}
              </span>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Rates and thresholds" description="Loaded only from the domain expert's rule pack.">
          <DataTable
            columns={["Parameter", "Value", "Effective from"]}
            rows={[
              ["Standard rate", <Expert key="v" />, <Expert key="e" />],
              ["Registration threshold", <Expert key="v" />, <Expert key="e" />],
              ["Rounding", <Expert key="v" />, <Expert key="e" />],
              ["Filing due dates", <Expert key="v" />, <Expert key="e" />],
            ]}
          />
        </SectionCard>
      </div>
    </Page>
  )
}

export function RulesPreview() {
  return (
    <Page title="Rules" description="Individual classification, calculation, validation and threshold rules.">
      <DataTable
        columns={["Code", "Rule set", "Kind", "Name", "Definition"]}
        rows={RULES.map((r) => [
          <span key="c" className="font-mono text-xs">
            {r.code}
          </span>,
          <span key="s" className="font-mono text-xs">
            {r.set}
          </span>,
          <StatusBadge key="k" status={r.kind} tone="neutral" />,
          r.name,
          <code
            key="d"
            className="bg-muted block max-w-md truncate rounded px-1.5 py-0.5 text-xs"
            title={JSON.stringify(r.definition)}
          >
            {JSON.stringify(r.definition)}
          </code>,
        ])}
      />
    </Page>
  )
}

export function RuleVersionsPreview() {
  return (
    <Page
      title="Rule versions"
      description="Drafts, published and retired versions with effective dates and provenance."
    >
      <DataTable
        columns={["Rule set", "Version", "Status", "Effective from", "Published", "Published by", "Source"]}
        rows={RULE_VERSIONS.map((v) => [
          <span key="s" className="font-mono text-xs">
            {v.set}
          </span>,
          `v${v.version}`,
          <StatusBadge key="st" status={v.status} />,
          v.effective === EXPERT_INPUT ? <Expert key="e" /> : formatDate(v.effective),
          v.published ? formatDate(v.published) : "Not published",
          v.by ?? "",
          v.source,
        ])}
      />
    </Page>
  )
}

export function TestScenariosPreview() {
  return (
    <Page
      title="Test scenarios"
      description="Expected results a rule version must reproduce before it can be published."
    >
      <DataTable
        columns={["Scenario", "Rule set", "Version", "Assertions", "Last run", "Result"]}
        numeric={[3]}
        rows={TEST_SCENARIOS.map((t) => [
          t.name,
          <span key="s" className="font-mono text-xs">
            {t.set}
          </span>,
          `v${t.version}`,
          t.assertions,
          formatDate(t.lastRun),
          <StatusBadge
            key="r"
            status={t.status}
            tone={t.status === "PASSED" ? "success" : t.status === "FAILED" ? "destructive" : "neutral"}
          />,
        ])}
      />
    </Page>
  )
}

/* ------------------------------------------------------------------ forms */

export function FormsPreview() {
  return (
    <Page title="Forms" description="Form definitions, field mappings and generated returns.">
      <Stats>
        <Stat label="Form definitions" value={FORM_DEFINITIONS.length} hint="Sample codes" />
        <Stat label="Generated this quarter" value={31} hint="Across all clients" />
        <Stat label="Awaiting review" value={6} />
        <Stat label="Approved" value={19} />
      </Stats>
      <SectionCard
        title="Form definitions"
        description="Real BIR form numbers and fields are supplied by the tax expert."
      >
        <FormDefinitionsTable />
      </SectionCard>
    </Page>
  )
}

function FormDefinitionsTable() {
  return (
    <DataTable
      columns={["Code", "Name", "Tax type", "Frequency", "Version", "Fields", "Status"]}
      numeric={[5]}
      rows={FORM_DEFINITIONS.map((f) => [
        <span key="c" className="font-mono text-xs">
          {f.code}
        </span>,
        f.name,
        f.taxType,
        f.frequency,
        `v${f.version}`,
        f.fields,
        <StatusBadge key="s" status={f.status} />,
      ])}
    />
  )
}

export function FormTemplatesPreview() {
  return (
    <Page title="Form templates" description="Layout and field mapping for each form definition.">
      <FormDefinitionsTable />
      <FormLayout title="SAMPLE-QVAT · field mapping" />
    </Page>
  )
}

function FormLayout({ title, values }: { title: string; values?: Record<string, ReactNode> }) {
  return (
    <SectionCard
      title={title}
      description="Every field is traceable to the record or calculation result it comes from."
    >
      <div className="space-y-5">
        {FORM_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{section.title}</h3>
            <DataTable
              columns={values ? ["Field", "Value", "Source"] : ["Field", "Source"]}
              rows={section.fields.map(([label, source]) =>
                values
                  ? [
                      label,
                      values[label] ?? "",
                      <code key="s" className="text-muted-foreground text-xs">
                        {source}
                      </code>,
                    ]
                  : [
                      label,
                      <code key="s" className="text-muted-foreground text-xs">
                        {source}
                      </code>,
                    ]
              )}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function FormVersionsPreview() {
  const rows = FORM_DEFINITIONS.flatMap((f) =>
    Array.from({ length: f.version }, (_, i) => {
      const version = f.version - i
      const status = i === 0 ? f.status : "RETIRED"
      return [
        <span key="c" className="font-mono text-xs">
          {f.code}
        </span>,
        f.name,
        `v${version}`,
        <StatusBadge key="s" status={status} />,
        status === "DRAFT" ? <Expert key="e" /> : formatDate(`202${6 - i}-01-01`),
      ]
    })
  )
  return (
    <Page
      title="Form versions"
      description="Each change to a form definition is a new version; generated forms keep the version they used."
    >
      <DataTable columns={["Code", "Name", "Version", "Status", "Effective from"]} rows={rows} />
    </Page>
  )
}

/* ----------------------------------------------------------- integrations */

export function IntegrationsPreview({ clients, provider }: { clients: Client[]; provider?: "XERO" | "QUICKBOOKS" }) {
  const all = sampleConnections(clients)
  const connections = provider ? all.filter((c) => c.provider === provider) : all
  const name = provider === "XERO" ? "Xero" : provider === "QUICKBOOKS" ? "QuickBooks Online" : "Integrations"
  const runs = sampleSyncRuns(provider ?? "all")
  const synced = connections.filter((c) => c.status === "SYNCED").length

  return (
    <Page title={name} description="Accounting connections, synchronisation and sync history.">
      <Stats>
        <Stat label="Connections" value={connections.length} />
        <Stat label="Healthy" value={synced} />
        <Stat label="Need attention" value={connections.length - synced} />
        <Stat label="Records imported" value={connections.reduce((s, c) => s + c.records, 0).toLocaleString("en-GB")} />
      </Stats>
      <SectionCard title="Connections" description="One accounting organisation per client.">
        <DataTable
          columns={["Client", "Provider", "Ledger", "Status", "Last sync", "Records", "Errors"]}
          numeric={[5, 6]}
          rows={connections.map((c) => [
            <Link key="c" href={`/clients/${c.clientId}/accounting`} className="font-medium hover:underline">
              {c.clientName}
            </Link>,
            c.provider === "XERO" ? "Xero" : "QuickBooks Online",
            c.externalName,
            <StatusBadge key="s" status={c.status} />,
            formatDateTime(c.lastSync),
            c.records.toLocaleString("en-GB"),
            c.errors,
          ])}
        />
      </SectionCard>
      <SectionCard title="Recent sync runs">
        <SyncRunsTable runs={runs} />
      </SectionCard>
    </Page>
  )
}

function SyncRunsTable({ runs }: { runs: ReturnType<typeof sampleSyncRuns> }) {
  return (
    <DataTable
      columns={["Started", "Trigger", "Status", "Fetched", "Created", "Updated", "Failed", "Duration"]}
      numeric={[3, 4, 5, 6]}
      rows={runs.map((r) => [
        formatDateTime(r.started),
        r.trigger,
        <StatusBadge key="s" status={r.status} />,
        r.fetched,
        r.created,
        r.updated,
        r.failed,
        r.duration,
      ])}
    />
  )
}

export function IntegrationSettingsPreview() {
  return (
    <Page title="Integration settings" description="Platform credentials and defaults for accounting providers.">
      <DataTable
        columns={["Provider", "Mode", "Credentials", "Scopes", "Default sync"]}
        rows={[
          [
            "Xero",
            <StatusBadge key="m" status="SIMULATOR" label="Simulator" />,
            "Set by platform operator",
            "accounting.transactions.read, accounting.contacts.read",
            "Every 6 hours",
          ],
          [
            "QuickBooks Online",
            <StatusBadge key="m" status="SIMULATOR" label="Simulator" />,
            "Set by platform operator",
            "com.intuit.quickbooks.accounting",
            "Every 6 hours",
          ],
        ]}
      />
    </Page>
  )
}

/* ------------------------------------------------------------ client tabs */

export function ClientAccountingPreview({ client }: { client: Client }) {
  const [connection] = sampleConnections([client])
  const rand = seeded(`${client.id}-entities`)
  return (
    <div className="space-y-5">
      <PreviewNotice />
      <Stats>
        <Stat
          label="Provider"
          value={connection.provider === "XERO" ? "Xero" : "QuickBooks"}
          hint={connection.externalName}
        />
        <Stat
          label="Status"
          value={<StatusBadge status={connection.status} />}
          hint={`Last sync ${formatDateTime(connection.lastSync)}`}
        />
        <Stat label="Records" value={connection.records.toLocaleString("en-GB")} />
        <Stat label="Sync errors" value={connection.errors} />
      </Stats>
      <SectionCard title="Imported records" description="Normalised records with source lineage back to the ledger.">
        <DataTable
          columns={["Entity", "Records", "Unmapped", "Last changed"]}
          numeric={[1, 2]}
          rows={SYNC_ENTITIES.map((entity) => [
            entity,
            count(rand, 20, 2400).toLocaleString("en-GB"),
            count(rand, 0, 3),
            formatDate(`2026-09-${String(count(rand, 10, 26)).padStart(2, "0")}`),
          ])}
        />
      </SectionCard>
      <SectionCard title="Sync history">
        <SyncRunsTable runs={sampleSyncRuns(client.id).slice(0, 5)} />
      </SectionCard>
    </div>
  )
}

export function ClientTaxPeriodsPreview({ client }: { client: Client }) {
  const periods = samplePeriods(client.id, isVat(client))
  return (
    <div className="space-y-5">
      <PreviewNotice />
      <DataTable
        columns={["Period", "Tax type", "Due", "Sales", "Tax payable", "Exceptions", "Status"]}
        numeric={[3, 4, 5]}
        rows={[...periods]
          .reverse()
          .map((p) => [
            p.label,
            p.taxType,
            formatDate(p.due),
            peso(p.sales),
            peso(p.taxDue),
            p.exceptions,
            <StatusBadge key="s" status={p.status} />,
          ])}
      />
    </div>
  )
}

export function ClientCalculationsPreview({ client }: { client: Client }) {
  const periods = samplePeriods(client.id, isVat(client))
  const current = periods[periods.length - 1]
  const lines = computation(client.id, current)
  return (
    <div className="space-y-5">
      <PreviewNotice />
      <SectionCard
        title={`${current.label} · calculation v${current.version}`}
        description={`${current.taxType}. Rule set version and rates are pinned to the calculation.`}
      >
        <DataTable
          columns={["Line", "Base", "Rate", "Amount", "Rule"]}
          numeric={[1, 3]}
          rows={[
            [
              "Total sales",
              peso(current.sales),
              "",
              peso(current.sales),
              <code key="r" className="text-xs">
                CLS-001
              </code>,
            ],
            [
              "Taxable base",
              peso(lines.base),
              "",
              peso(lines.base),
              <code key="r" className="text-xs">
                CLS-002
              </code>,
            ],
            [
              "Tax on base",
              peso(lines.base),
              <Expert key="x" />,
              peso(lines.tax),
              <code key="r" className="text-xs">
                CAL-001
              </code>,
            ],
            [
              "Allowable credits",
              peso(current.purchases),
              <Expert key="x" />,
              peso(lines.credits),
              <code key="r" className="text-xs">
                CAL-002
              </code>,
            ],
            [<strong key="l">Tax payable</strong>, "", "", <strong key="a">{peso(current.taxDue)}</strong>, ""],
          ]}
        />
      </SectionCard>
      <SectionCard title="Calculation history">
        <DataTable
          columns={["Period", "Version", "Run", "Tax payable", "Status"]}
          numeric={[3]}
          rows={[...periods]
            .reverse()
            .map((p) => [
              p.label,
              `v${p.version}`,
              formatDate(workDate(p, "10")),
              peso(p.taxDue),
              <StatusBadge key="s" status={p.status} />,
            ])}
        />
      </SectionCard>
    </div>
  )
}

export function sampleExceptions(seed: string, limit = 4) {
  const rand = seeded(`${seed}-exceptions`)
  const n = count(rand, 2, limit)
  return Array.from({ length: n }, (_, i) => {
    const t = EXCEPTION_TEMPLATES[Math.floor(rand() * EXCEPTION_TEMPLATES.length)]
    return {
      ...t,
      id: `${seed}-${i}`,
      raised: `2026-09-${String(count(rand, 12, 26)).padStart(2, "0")}T09:00:00+08:00`,
      resolved: rand() < 0.3,
    }
  })
}

const SEVERITY_ORDER = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 } as Record<string, number>

export function ClientExceptionsPreview({ client }: { client: Client }) {
  const items = sampleExceptions(client.id, 6).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  return (
    <div className="space-y-5">
      <PreviewNotice />
      <DataTable
        columns={["Severity", "Exception", "Detail", "Raised", "Status"]}
        rows={items.map((e) => [
          <StatusBadge key="sv" status={e.severity} tone={e.severity === "ERROR" ? "destructive" : undefined} />,
          <span key="t" className="font-medium">
            {e.title}
          </span>,
          <span key="d" className="text-muted-foreground text-sm">
            {e.description}
          </span>,
          formatDate(e.raised),
          <StatusBadge key="s" status={e.resolved ? "RESOLVED" : "OPEN"} tone={e.resolved ? "success" : "warning"} />,
        ])}
      />
    </div>
  )
}

export function ClientFormsPreview({ client }: { client: Client }) {
  const periods = samplePeriods(client.id, isVat(client))
  const current = periods[periods.length - 1]
  const code = isVat(client) ? "SAMPLE-QVAT" : "SAMPLE-QPT"
  const lines = computation(client.id, current)
  return (
    <div className="space-y-5">
      <PreviewNotice />
      <DataTable
        columns={["Form", "Period", "Version", "Generated", "Status"]}
        rows={[...periods].reverse().map((p) => [
          <span key="f" className="font-mono text-xs">
            {code}
          </span>,
          p.label,
          `v${p.version}`,
          formatDate(workDate(p, "12")),
          <StatusBadge key="s" status={p.status} />,
        ])}
      />
      <FormLayout
        title={`${code} · ${current.label}`}
        values={{
          "Taxpayer identification number": (
            <span className="font-mono text-xs">{client.taxpayer_identifier ?? "Not recorded"}</span>
          ),
          "Registered name": client.legal_name,
          "Registered address": client.profile?.business_address?.city ?? "Not recorded",
          "Revenue district office": client.profile?.registration_information?.rdo_code ?? "Not recorded",
          "Period covered": current.label,
          "Line A · Total sales": peso(current.sales),
          "Line B · Taxable base": peso(lines.base),
          "Line C · Tax on base": peso(lines.tax),
          "Line D · Allowable credits": peso(lines.credits),
          "Line E · Tax payable": peso(lines.payable),
          Signatory: "Pending approval",
          "Date approved": "Pending approval",
        }}
      />
    </div>
  )
}

export function ClientWorkingPapersPreview({ client }: { client: Client }) {
  const periods = samplePeriods(client.id, isVat(client))
  const papers = ["Sales summary", "Purchases and credits", "Account mapping", "Variance analysis", "Tax computation"]
  return (
    <div className="space-y-5">
      <PreviewNotice />
      <DataTable
        columns={["Working paper", "Period", "Format", "Prepared", "Status"]}
        rows={[...periods]
          .reverse()
          .slice(0, 2)
          .flatMap((p) =>
            papers.map((paper) => [
              paper,
              p.label,
              "XLSX, PDF",
              formatDate(workDate(p, "08")),
              <StatusBadge key="s" status={p.status === "FINALIZED" ? "FINALIZED" : "DRAFT"} />,
            ])
          )}
      />
    </div>
  )
}

/* -------------------------------------------------------------- dashboard */

export function DashboardExceptionsPreview({ clients }: { clients: Client[] }) {
  const items = clients
    .slice(0, 8)
    .flatMap((client) =>
      sampleExceptions(client.id, 3)
        .filter((e) => !e.resolved)
        .map((e) => ({ ...e, client }))
    )
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 6)
  return (
    <div className="space-y-3">
      <PreviewNotice />
      <ul className="divide-y text-sm">
        {items.map((e) => (
          <li key={e.id} className="flex items-start gap-3 py-2">
            <StatusBadge status={e.severity} tone={e.severity === "ERROR" ? "destructive" : undefined} />
            <div className="min-w-0">
              <div className="font-medium">{e.title}</div>
              <Link
                href={`/clients/${e.client.id}/exceptions`}
                className="text-muted-foreground text-xs hover:underline"
              >
                {e.client.legal_name}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DashboardObligationsPreview({ clients }: { clients: Client[] }) {
  const rows = clients.slice(0, 6).map((client) => {
    const p = samplePeriods(client.id, isVat(client))[3]
    return { client, p }
  })
  return (
    <div className="space-y-3">
      <PreviewNotice />
      <ul className="divide-y text-sm">
        {rows.map(({ client, p }) => (
          <li key={client.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="truncate font-medium">{client.legal_name}</div>
              <div className="text-muted-foreground text-xs">
                {taxTypeFor(isVat(client))} · {p.label}
              </div>
            </div>
            <div className="shrink-0 text-right text-xs">
              <div className="tabular-nums">Due {formatDate(p.due)}</div>
              <StatusBadge status={p.status} className="mt-1" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DashboardIntegrationsPreview({ clients }: { clients: Client[] }) {
  const connections = sampleConnections(clients)
  const byStatus = new Map<string, number>()
  for (const c of connections) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1)
  return (
    <div className="space-y-3">
      <PreviewNotice />
      <BreakdownBars
        caption="Sample connections by status"
        unit="connections"
        items={[...byStatus.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([key, value]) => ({
            key,
            label: key
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/^./, (c) => c.toUpperCase()),
            count: value,
          }))}
      />
    </div>
  )
}
