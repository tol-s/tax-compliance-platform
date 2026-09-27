import { ScaleIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { Button } from "@/components/ui/button"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Tax engine" }

export default async function TaxEnginePage() {
  const me = await requireMe()
  if (!can(me, "tax_rules.view")) return <AccessDenied title={"Tax engine"} permission="tax_rules.view" />

  return (
    <PlannedFeature
      title="Tax engine"
      description="Jurisdictions, tax types, rule sets, versions, classifications and thresholds."
      icon={ScaleIcon}
      emptyTitle="No rule sets loaded"
      emptyDescription="Philippine rates, thresholds, classifications and effective dates are supplied by the domain expert and loaded as draft rule versions for review and publication. Nothing is assumed."
      phase={4}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/tax-engine/rules">View rules</Link>
        </Button>
      }
    />
  )
}
