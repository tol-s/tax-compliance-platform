import { PlugIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Integration settings" }

export default async function SettingsIntegrationsPage() {
  const me = await requireMe()
  if (!can(me, "settings.manage")) return <AccessDenied title={"Integration settings"} permission="settings.manage" />

  return (
    <PlannedFeature
      title="Integration settings"
      description="Platform credentials and defaults for accounting providers."
      icon={PlugIcon}
      emptyTitle="No provider settings"
      emptyDescription="Provider credentials are configured by the platform operator through environment configuration, never stored in the browser."
      phase={3}
    />
  )
}
