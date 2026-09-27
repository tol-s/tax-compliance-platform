"use client"

import { useState } from "react"

import { SectionCard } from "@/components/app/section-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientAudit } from "@/features/clients/api"

import { AuditTimeline } from "./audit-timeline"

export function ClientAuditLog({ clientId }: { clientId: string }) {
  const [page, setPage] = useState(1)
  const { data, isPending, isFetching } = useClientAudit(clientId, page)
  const meta = data?.meta

  return (
    <SectionCard
      title="Audit log"
      description="Append-only. Every change to this client, its registration and its documents."
      action={
        meta && meta.last_page > 1 ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground tabular-nums">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Newer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= meta.last_page || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Older
            </Button>
          </div>
        ) : null
      }
    >
      {isPending ? <Skeleton className="h-40" /> : <AuditTimeline events={data?.data ?? []} />}
    </SectionCard>
  )
}
