import { PlugIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { Button } from "@/components/ui/button"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Integrations" }

export default async function IntegrationsPage() {
  const me = await requireMe()
  if (!can(me, "clients.view")) return <AccessDenied title={"Integrations"} permission="clients.view" />

  return (
    <PlannedFeature
      title="Integrations"
      description="Accounting system connections across all clients."
      icon={PlugIcon}
      emptyTitle="No accounting connections"
      emptyDescription="Connections are made per client. Once a client exists, connect Xero or QuickBooks Online from the client's Accounting tab. Tokens are stored encrypted server-side and never reach the browser."
      phase={3}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/integrations/xero">Xero</Link>
        </Button>
      }
    />
  )
}
