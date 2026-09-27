import { FileSpreadsheetIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { ClientWorkingPapersPreview, loadPreviewClient } from "@/features/preview/components"
import { requireMe } from "@/lib/auth/me"

export default async function WorkingPapersTab({ params }: PageProps<"/clients/[id]/working-papers">) {
  const me = await requireMe()
  if (me.organization?.is_demo)
    return <ClientWorkingPapersPreview client={await loadPreviewClient((await params).id)} />

  return (
    <EmptyState
      icon={FileSpreadsheetIcon}
      title="No working papers"
      description="Working papers are generated from calculations and are versioned and exportable."
    />
  )
}
