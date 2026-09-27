import { GitBranchIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"
import { FormVersionsPreview } from "@/features/preview/components"

export const metadata: Metadata = { title: "Form versions" }

export default async function FormsVersionsPage() {
  const me = await requireMe()
  if (!can(me, "forms.view")) return <AccessDenied title={"Form versions"} permission="forms.view" />
  if (me.organization?.is_demo) return <FormVersionsPreview />

  return (
    <PlannedFeature
      title="Form versions"
      description="Effective-dated versions of each form definition."
      icon={GitBranchIcon}
      emptyTitle="No form versions"
      emptyDescription="When an official form changes, a new version is added; historical filings are never regenerated with a newer template."
      phase={7}
    />
  )
}
