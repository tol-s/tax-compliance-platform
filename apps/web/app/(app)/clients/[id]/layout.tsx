import { notFound } from "next/navigation"

import { ClientTabs } from "@/components/app/client-tabs"
import { isApiError } from "@/lib/api/errors"
import { apiFetch } from "@/lib/api/server"
import { requireMe } from "@/lib/auth/me"

interface ClientSummary {
  id: string
  legal_name: string
  taxpayer_identifier: string | null
}

/**
 * Client workspace. The clients API arrives in phase 2; until then every id
 * resolves to "not found" rather than rendering a fabricated taxpayer.
 */
export default async function ClientLayout({ children, params }: LayoutProps<"/clients/[id]">) {
  await requireMe()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  let client: ClientSummary
  try {
    client = (await apiFetch<{ data: ClientSummary }>(`clients/${id}`)).data
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 403)) notFound()
    throw error
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">{client.legal_name}</h1>
        {client.taxpayer_identifier ? (
          <p className="text-muted-foreground font-mono text-xs">TIN {client.taxpayer_identifier}</p>
        ) : null}
      </header>
      <ClientTabs clientId={client.id} />
      {children}
    </div>
  )
}
