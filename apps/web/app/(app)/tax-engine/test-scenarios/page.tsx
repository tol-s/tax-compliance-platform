import { FlaskConicalIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Test scenarios" }

export default async function TaxEngineTestScenariosPage() {
  const me = await requireMe()
  if (!can(me, "tax_rules.view")) return <AccessDenied title={"Test scenarios"} permission="tax_rules.view" />

  return (
    <PlannedFeature
      title="Test scenarios"
      description="Golden scenarios: taxpayer profile, accounting fixture and period, with expected results."
      icon={FlaskConicalIcon}
      emptyTitle="No test scenarios"
      emptyDescription="Scenarios compare expected and actual classifications, calculations and form values, and show PASS or FAIL. Expected values come from the domain expert."
      phase={4}
    />
  )
}
