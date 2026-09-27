import { AssignmentsCard } from "@/features/clients/assignments-card"
import { ClientRecentActivity } from "@/features/clients/client-recent-activity"
import { RegistrationCard } from "@/features/clients/registration-card"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export default async function OverviewTab({ params }: PageProps<"/clients/[id]/overview">) {
  const [{ id }, me] = await Promise.all([params, requireMe()])

  return (
    <div className="space-y-6">
      {can(me, "tax_profile.view") ? <RegistrationCard clientId={id} /> : null}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AssignmentsCard clientId={id} />
        {can(me, "audit.view") ? <ClientRecentActivity clientId={id} /> : null}
      </div>
    </div>
  )
}
