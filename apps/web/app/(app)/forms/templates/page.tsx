import { FileTextIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"
import { FormTemplatesPreview } from "@/features/preview/components"

export const metadata: Metadata = { title: "Form templates" }

export default async function FormsTemplatesPage() {
  const me = await requireMe()
  if (!can(me, "forms.view")) return <AccessDenied title={"Form templates"} permission="forms.view" />
  if (me.organization?.is_demo) return <FormTemplatesPreview />

  return (
    <PlannedFeature
      title="Form templates"
      description="Print-ready templates rendered deterministically to PDF."
      icon={FileTextIcon}
      emptyTitle="No templates"
      emptyDescription="Templates are versioned HTML layouts. A generated form always keeps the template version it was produced with."
      phase={7}
    />
  )
}
