import { GitBranchIcon } from "lucide-react"
import type { Metadata } from "next"
import { AccessDenied } from "@/components/app/access-denied"
import { PlannedFeature } from "@/components/app/planned-feature"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export const metadata: Metadata = { title: "Rule versions" }

export default async function TaxEngineVersionsPage() {
  const me = await requireMe()
  if (!can(me, "tax_rules.view")) return <AccessDenied title={"Rule versions"} permission="tax_rules.view" />

  return (
    <PlannedFeature
      title="Rule versions"
      description="Effective-dated versions. Published versions are immutable; changes create a new version."
      icon={GitBranchIcon}
      emptyTitle="No rule versions"
      emptyDescription="Historical periods always use the version effective for that period, so past calculations remain reproducible."
      phase={4}
    />
  )
}
