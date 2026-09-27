import { AccessDenied } from "@/components/app/access-denied"
import { ClientAuditLog } from "@/features/audit/client-audit-log"
import { requireMe } from "@/lib/auth/me"
import { can } from "@/lib/auth/permissions"

export default async function AuditLogTab({ params }: PageProps<"/clients/[id]/audit-log">) {
  const [{ id }, me] = await Promise.all([params, requireMe()])
  if (!can(me, "audit.view")) return <AccessDenied title="Audit log" permission="audit.view" />

  return <ClientAuditLog clientId={id} />
}
