import { LockIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"

export function AccessDenied({ title, permission }: { title: string; permission: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <EmptyState
        icon={LockIcon}
        title="You do not have access to this area"
        description={
          <>
            Your role in this organisation does not include <code className="font-mono text-xs">{permission}</code>. Ask
            an administrator if you need access.
          </>
        }
      />
    </div>
  )
}
