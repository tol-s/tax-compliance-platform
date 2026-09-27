import { notFound } from "next/navigation"

import { ClientTabs } from "@/components/app/client-tabs"
import { StatusBadge } from "@/components/app/status-badge"
import { isApiError } from "@/lib/api/errors"
import { apiFetch } from "@/lib/api/server"
import { requireMe } from "@/lib/auth/me"
import { formatDate } from "@/lib/format"
import { sampleConnections, samplePeriods } from "@/features/preview/data"
import type { Client } from "@/types/api"

async function loadClient(id: string): Promise<Client> {
  try {
    return (await apiFetch<{ data: Client }>(`clients/${id}`)).data
  } catch (error) {
    // Unknown, foreign-tenant and unassigned clients all read as "not found".
    if (isApiError(error) && (error.status === 404 || error.status === 403)) notFound()
    throw error
  }
}

export default async function ClientLayout({ children, params }: LayoutProps<"/clients/[id]">) {
  const me = await requireMe()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const client = await loadClient(id)
  const registration = client.current_registration
  // Staging organisations show sample connection and period facts to match the preview tabs.
  const preview = me.organization?.is_demo
    ? {
        connection: sampleConnections([client])[0],
        period: samplePeriods(client.id, registration?.vat_status === "VAT_REGISTERED")[3],
      }
    : null

  const facts: [string, React.ReactNode][] = [
    [
      "Taxpayer ID",
      <span key="tin" className="font-mono text-xs">
        {client.taxpayer_identifier ?? "Not recorded"}
      </span>,
    ],
    [
      "Registration",
      registration ? (
        <span key="reg" className="flex items-center gap-1.5">
          <StatusBadge status={registration.vat_status} />
          <span className="text-muted-foreground text-xs">
            {registration.status_source_label}, from {formatDate(registration.effective_from)}
          </span>
        </span>
      ) : (
        <StatusBadge key="reg" status="NOT_RECORDED" label="Not recorded" tone="warning" />
      ),
    ],
    [
      "Accounting",
      preview ? (
        <span key="acc" className="flex items-center gap-1.5">
          <StatusBadge status={preview.connection.status} />
          <span className="text-muted-foreground text-xs">
            {preview.connection.provider === "XERO" ? "Xero" : "QuickBooks Online"} (sample)
          </span>
        </span>
      ) : (
        <span key="acc" className="text-muted-foreground">
          Not connected
        </span>
      ),
    ],
    [
      "Current period",
      preview ? (
        <span key="per" className="flex items-center gap-1.5">
          <StatusBadge status={preview.period.status} />
          <span className="text-muted-foreground text-xs">{preview.period.label} (sample)</span>
        </span>
      ) : (
        <span key="per" className="text-muted-foreground">
          None open
        </span>
      ),
    ],
    [
      "Compliance",
      registration?.verified ? (
        <StatusBadge key="cmp" status="READY" label="Registration verified" tone="success" />
      ) : (
        <StatusBadge key="cmp" status="REVIEW_REQUIRED" label="Registration unverified" tone="warning" />
      ),
    ],
  ]

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{client.legal_name}</h1>
          {client.trade_name ? <p className="text-muted-foreground text-sm">Trading as {client.trade_name}</p> : null}
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="space-y-0.5">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="flex min-h-5 items-center">{value}</dd>
            </div>
          ))}
        </dl>
      </header>
      <ClientTabs clientId={client.id} />
      {children}
    </div>
  )
}
