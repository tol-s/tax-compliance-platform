import { PlugIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"
import { IntegrationsPreview, loadPreviewClients } from "@/features/preview/components"

export const metadata: Metadata = { title: "Xero" }

export default async function IntegrationsXeroPage() {
  const me = await requireMe()
  if (!can(me, "clients.view")) return <AccessDenied title={"Xero"} permission="clients.view" />
  if (me.organization?.is_demo) return <IntegrationsPreview clients={await loadPreviewClients()} provider="XERO" />

  return (
    <PlannedFeature
      title="Xero"
      description="OAuth 2.0 connection, synchronisation and sync history for Xero organisations."
      icon={PlugIcon}
      emptyTitle="Xero is not configured"
      emptyDescription="Xero connections require the platform's Xero app credentials (XERO_CLIENT_ID, XERO_CLIENT_SECRET). Without them, a clearly labelled simulator using fixture data is available for demonstrations."
      phase={3}
    />
  )
}
