import { ScaleIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Tax rules" }

export default async function TaxEngineRulesPage() {
  const me = await requireMe()
  if (!can(me, "tax_rules.view")) return <AccessDenied title={"Tax rules"} permission="tax_rules.view" />

  return (
    <PlannedFeature
      title="Tax rules"
      description="Structured rule definitions (conditions and formulas) grouped by rule set."
      icon={ScaleIcon}
      emptyTitle="No rules defined"
      emptyDescription="Rules are structured JSON evaluated by a closed set of operators: no stored code. Each rule records its legal source and the domain inputs it still requires."
      phase={4}
    />
  )
}
