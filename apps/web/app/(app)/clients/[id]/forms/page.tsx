import { FileTextIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { ClientFormsPreview, loadPreviewClient } from "@/features/preview/components"
import { requireMe } from "@/lib/auth/me"

export default async function FormsTab({ params }: PageProps<"/clients/[id]/forms">) {
  const me = await requireMe()
  if (me.organization?.is_demo) return <ClientFormsPreview client={await loadPreviewClient((await params).id)} />

  return (
    <EmptyState
      icon={FileTextIcon}
      title="No forms"
      description="Forms are populated automatically from calculations, with provenance for every field."
    />
  )
}
