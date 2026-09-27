import { AccessDenied } from "@/components/app/access-denied"
import { DocumentsPanel } from "@/features/clients/documents-panel"
import { ProfileCard } from "@/features/clients/profile-card"
import { RegistrationCard } from "@/features/clients/registration-card"
import { RegistrationHistory } from "@/features/clients/registration-history"
import { SectionCard } from "@/components/app/section-card"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export default async function TaxProfileTab({ params }: PageProps<"/clients/[id]/tax-profile">) {
  const [{ id }, me] = await Promise.all([params, requireMe()])
  if (!can(me, "tax_profile.view")) return <AccessDenied title="Tax profile" permission="tax_profile.view" />

  return (
    <div className="space-y-6">
      <RegistrationCard clientId={id} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <ProfileCard clientId={id} />
          <SectionCard title="Tax types and configuration" description="Which tax types and rule sets apply.">
            <p className="text-muted-foreground text-sm">
              Tax types are configured once the Philippine rule packs are supplied and published in the tax engine. The
              registered VAT status above will select the applicable calculation path.
            </p>
          </SectionCard>
        </div>
        <div className="space-y-6">
          <RegistrationHistory clientId={id} />
          <DocumentsPanel clientId={id} />
        </div>
      </div>
    </div>
  )
}
