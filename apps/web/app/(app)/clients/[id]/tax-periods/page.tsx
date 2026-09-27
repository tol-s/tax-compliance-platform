import { CalendarRangeIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { ClientTaxPeriodsPreview, loadPreviewClient } from "@/features/preview/components"
import { requireMe } from "@/lib/auth/me"

export default async function TaxPeriodsTab({ params }: PageProps<"/clients/[id]/tax-periods">) {
  const me = await requireMe()
  if (me.organization?.is_demo) return <ClientTaxPeriodsPreview client={await loadPreviewClient((await params).id)} />

  return (
    <EmptyState
      icon={CalendarRangeIcon}
      title="No tax periods"
      description="Tax periods move through the filing workflow from open to finalised."
    />
  )
}
