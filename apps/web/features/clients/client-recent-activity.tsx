"use client"

import Link from "next/link"

import { SectionCard } from "@/components/app/section-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuditTimeline } from "@/features/audit/audit-timeline"

import { useClientAudit } from "./api"

export function ClientRecentActivity({ clientId }: { clientId: string }) {
  const { data, isPending } = useClientAudit(clientId, 1)
  const events = (data?.data ?? []).slice(0, 5)

  return (
    <SectionCard
      title="Recent activity"
      action={
        <Button asChild variant="ghost" size="sm">
          <Link href={`/clients/${clientId}/audit-log`}>View all</Link>
        </Button>
      }
    >
      {isPending ? <Skeleton className="h-24" /> : <AuditTimeline events={events} />}
    </SectionCard>
  )
}
