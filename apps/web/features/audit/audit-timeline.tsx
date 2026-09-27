"use client"

import { ChevronDownIcon } from "lucide-react"

import { Badge } from "@/components/reui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { auditActionLabel, formatDateTime } from "@/lib/format"
import type { AuditEvent } from "@/types/api"

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/** Before and after values side by side, one row per changed attribute. */
export function AuditDiff({ event }: { event: AuditEvent }) {
  const keys = Array.from(new Set([...Object.keys(event.before ?? {}), ...Object.keys(event.after ?? {})]))
  const metadata = Object.entries(event.metadata ?? {})
  if (!keys.length && !metadata.length) return null

  return (
    <div className="bg-muted/40 mt-2 overflow-x-auto rounded-md border text-xs">
      {keys.length ? (
        <table className="w-full">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="px-2 py-1 text-left font-medium">Field</th>
              <th className="px-2 py-1 text-left font-medium">Before</th>
              <th className="px-2 py-1 text-left font-medium">After</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {keys.map((key) => (
              <tr key={key} className="border-b last:border-b-0">
                <td className="px-2 py-1 font-sans">{key.replace(/_/g, " ")}</td>
                <td className="text-destructive-foreground px-2 py-1 break-all">{renderValue(event.before?.[key])}</td>
                <td className="text-success-foreground px-2 py-1 break-all">{renderValue(event.after?.[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {metadata.length ? (
        <dl className="grid gap-1 px-2 py-1.5 sm:grid-cols-[8rem_1fr]">
          {metadata.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{key.replace(/_/g, " ")}</dt>
              <dd className="break-all">{renderValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="relative space-y-0 border-l pl-5" aria-label="Audit events">
      {events.map((event) => {
        const hasDetail = event.before || event.after || event.metadata
        return (
          <li key={event.id} className="relative pb-4 last:pb-0">
            <span
              className="bg-background border-primary absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2"
              aria-hidden
            />
            <Collapsible>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium">{auditActionLabel(event.action)}</span>
                <span className="text-muted-foreground text-xs">by {event.actor.name}</span>
                <time className="text-muted-foreground text-xs tabular-nums" dateTime={event.created_at}>
                  {formatDateTime(event.created_at)}
                </time>
                {hasDetail ? (
                  <CollapsibleTrigger className="text-primary inline-flex items-center gap-0.5 text-xs underline-offset-4 hover:underline">
                    Details <ChevronDownIcon className="size-3" aria-hidden />
                  </CollapsibleTrigger>
                ) : null}
              </div>
              <CollapsibleContent>
                <AuditDiff event={event} />
                <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                  <Badge variant="outline" size="sm" className="mr-1 font-sans">
                    {event.action}
                  </Badge>
                  correlation {event.correlation_id ?? "–"}
                </p>
              </CollapsibleContent>
            </Collapsible>
          </li>
        )
      })}
    </ol>
  )
}
