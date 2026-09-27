import { FileTextIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { Button } from "@/components/ui/button"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"
import { FormsPreview } from "@/features/preview/components"

export const metadata: Metadata = { title: "Forms" }

export default async function FormsPage() {
  const me = await requireMe()
  if (!can(me, "forms.view")) return <AccessDenied title={"Forms"} permission="forms.view" />
  if (me.organization?.is_demo) return <FormsPreview />

  return (
    <PlannedFeature
      title="Forms"
      description="Official form definitions, versions and field mappings."
      icon={FileTextIcon}
      emptyTitle="No form definitions"
      emptyDescription="Official BIR form schemas (fields, positions and mappings) will be supplied by the domain expert and loaded through the form engine. No form layout is invented."
      phase={7}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/forms/templates">Templates</Link>
        </Button>
      }
    />
  )
}
