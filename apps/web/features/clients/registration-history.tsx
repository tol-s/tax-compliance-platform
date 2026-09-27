"use client"

import { FileTextIcon } from "lucide-react"

import { ErrorState } from "@/components/app/error-state"
import { SectionCard } from "@/components/app/section-card"
import { StatusBadge } from "@/components/app/status-badge"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatDateTime } from "@/lib/format"

import { documentDownloadUrl, useRegistrationHistory } from "./api"

/** Every registration record ever held, newest first. Rows are immutable; changes append. */
export function RegistrationHistory({ clientId }: { clientId: string }) {
  const { data, isPending, isError } = useRegistrationHistory(clientId)

  return (
    <SectionCard title="Registration history" description="Effective-dated and append-only.">
      {isPending ? (
        <Skeleton className="h-24" />
      ) : isError ? (
        <ErrorState title="History could not be loaded" />
      ) : (
        <Timeline value={data.length} aria-label="Registration history">
          {data.map((entry, index) => (
            <TimelineItem key={entry.id} step={index + 1} className="group-data-[orientation=vertical]/timeline:ms-8">
              <TimelineHeader>
                <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem)] group-data-[orientation=vertical]/timeline:translate-y-5" />
                <TimelineDate>
                  {formatDate(entry.effective_from)} to{" "}
                  {entry.effective_to ? formatDate(entry.effective_to) : "present"}
                </TimelineDate>
                <TimelineTitle className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={entry.vat_status} />
                  <span className="text-sm font-medium">{entry.status_source_label}</span>
                  {entry.is_current ? <span className="text-muted-foreground text-xs">(current)</span> : null}
                </TimelineTitle>
                <TimelineIndicator className="size-3 group-data-[orientation=vertical]/timeline:-left-6" />
              </TimelineHeader>
              <TimelineContent className="space-y-1 pb-5">
                {entry.reason ? <p className="text-foreground">{entry.reason}</p> : null}
                <p className="text-xs">
                  Recorded {formatDateTime(entry.created_at)}
                  {entry.created_by ? ` by ${entry.created_by.name}` : ""}
                </p>
                {entry.source_document ? (
                  <a
                    href={documentDownloadUrl(entry.source_document.id)}
                    className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                  >
                    <FileTextIcon className="size-3.5" aria-hidden /> {entry.source_document.original_name}
                  </a>
                ) : (
                  <p className="text-warning-foreground text-xs">No supporting document</p>
                )}
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </SectionCard>
  )
}
