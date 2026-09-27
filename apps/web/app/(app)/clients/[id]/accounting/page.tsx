import { DatabaseIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { ClientAccountingPreview, loadPreviewClient } from "@/features/preview/components"
import { requireMe } from "@/lib/auth/me"

export default async function AccountingTab({ params }: PageProps<"/clients/[id]/accounting">) {
  const me = await requireMe()
  if (me.organization?.is_demo) return <ClientAccountingPreview client={await loadPreviewClient((await params).id)} />

  return (
    <EmptyState
      icon={DatabaseIcon}
      title="No accounting data"
      description="Connect Xero or QuickBooks Online, then explore normalised accounting records with full source lineage."
    />
  )
}
