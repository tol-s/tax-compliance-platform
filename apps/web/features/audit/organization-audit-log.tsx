"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ScrollTextIcon } from "lucide-react"
import Link from "next/link"
import { Fragment, useState } from "react"

import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { bffFetch } from "@/lib/api/client"
import { auditActionLabel, formatDateTime } from "@/lib/format"
import type { AuditEvent, Paginated } from "@/types/api"

import { AuditDiff } from "./audit-timeline"

const ACTION_FILTERS = [
  ["", "All actions"],
  ["auth", "Sign-ins"],
  ["client", "Clients"],
  ["registration_status", "Registration status"],
  ["taxpayer_profile", "Tax profile"],
  ["document", "Documents"],
  ["membership", "Members"],
  ["organization", "Organisation"],
] as const

export function OrganizationAuditLog() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const params = new URLSearchParams({ page: String(page), per_page: "50" })
  if (action) params.set("action", action)
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  const query = useQuery({
    queryKey: ["audit", params.toString()],
    queryFn: () => bffFetch<Paginated<AuditEvent>>(`audit?${params}`),
    placeholderData: keepPreviousData,
  })
  const meta = query.data?.meta
  const reset = (fn: () => void) => {
    fn()
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <NativeSelect
          value={action}
          onChange={(e) => reset(() => setAction(e.target.value))}
          aria-label="Filter by action"
        >
          {ACTION_FILTERS.map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
          From
          <Input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} className="w-40" />
        </label>
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
          To
          <Input type="date" value={to} onChange={(e) => reset(() => setTo(e.target.value))} className="w-40" />
        </label>
        {meta ? (
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {meta.total.toLocaleString("en-GB")} events
          </span>
        ) : null}
      </div>

      {query.isPending ? (
        <Skeleton className="h-64" />
      ) : !query.data?.data.length ? (
        <EmptyState icon={ScrollTextIcon} title="No events" description="No audit events match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-44">Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.data.map((event) => {
                const open = expanded === event.id
                const hasDetail = Boolean(event.before || event.after || event.metadata)
                return (
                  <Fragment key={event.id}>
                    <TableRow>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">
                        {formatDateTime(event.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{auditActionLabel(event.action)}</div>
                        <div className="text-muted-foreground font-mono text-[11px]">{event.action}</div>
                      </TableCell>
                      <TableCell>{event.actor.name}</TableCell>
                      <TableCell className="text-xs">
                        {event.client_id ? (
                          <Link
                            className="text-primary underline-offset-4 hover:underline"
                            href={`/clients/${event.client_id}/audit-log`}
                          >
                            Client record
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{event.entity_type?.replace(/_/g, " ") ?? "–"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasDetail ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-expanded={open}
                            onClick={() => setExpanded(open ? null : event.id)}
                          >
                            {open ? "Hide" : "Details"}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="pt-0">
                          <AuditDiff event={event} />
                          <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                            correlation {event.correlation_id ?? "–"}
                            {event.ip ? ` · ip ${event.ip}` : ""}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {meta && meta.last_page > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-muted-foreground tabular-nums">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}
