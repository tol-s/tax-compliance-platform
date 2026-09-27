import { CalculatorIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { ClientCalculationsPreview, loadPreviewClient } from "@/features/preview/components"
import { requireMe } from "@/lib/auth/me"

export default async function CalculationsTab({ params }: PageProps<"/clients/[id]/calculations">) {
  const me = await requireMe()
  if (me.organization?.is_demo) return <ClientCalculationsPreview client={await loadPreviewClient((await params).id)} />

  return (
    <EmptyState
      icon={CalculatorIcon}
      title="No calculations"
      description="Every calculation is versioned and traceable to rules, classifications and source transactions."
    />
  )
}
