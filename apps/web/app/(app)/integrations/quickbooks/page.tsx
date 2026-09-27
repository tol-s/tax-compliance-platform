import { PlugIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "QuickBooks Online" }

export default async function IntegrationsQuickbooksPage() {
  const me = await requireMe()
  if (!can(me, "clients.view")) return <AccessDenied title={"QuickBooks Online"} permission="clients.view" />

  return (
    <PlannedFeature
      title="QuickBooks Online"
      description="OAuth 2.0 connection, synchronisation and sync history for QuickBooks Online companies."
      icon={PlugIcon}
      emptyTitle="QuickBooks Online is not configured"
      emptyDescription="QuickBooks connections require the platform's Intuit app credentials (QBO_CLIENT_ID, QBO_CLIENT_SECRET). Without them, a clearly labelled simulator using fixture data is available for demonstrations."
      phase={3}
    />
  )
}
