import { ShieldAlertIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { ClientExceptionsPreview, loadPreviewClient } from "@/features/preview/components"
import { requireMe } from "@/lib/auth/me"

export default async function ExceptionsTab({ params }: PageProps<"/clients/[id]/exceptions">) {
  const me = await requireMe()
  if (me.organization?.is_demo) return <ClientExceptionsPreview client={await loadPreviewClient((await params).id)} />

  return (
    <EmptyState
      icon={ShieldAlertIcon}
      title="No exceptions"
      description="Missing data, unmapped accounts, threshold advisories and anomalies for this client."
    />
  )
}
