"use client"

import { useQuery } from "@tanstack/react-query"
import { CheckIcon } from "lucide-react"
import { Fragment } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { bffFetch } from "@/lib/api/client"
import type { RoleMatrix } from "@/types/api"

/** Read-only matrix of the system roles, served from the API's permission catalogue. */
export function RoleMatrixTable() {
  const { data, isPending } = useQuery({ queryKey: ["roles"], queryFn: () => bffFetch<RoleMatrix>("roles") })
  if (isPending || !data) return <Skeleton className="h-96" />

  const groups = Array.from(new Set(data.permissions.map((p) => p.group)))

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableCaption className="sr-only">Permissions granted by each role</TableCaption>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="min-w-72">Permission</TableHead>
            {data.data.map((role) => (
              <TableHead key={role.key} className="text-center text-xs whitespace-nowrap">
                {role.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="hover:bg-transparent">
            <TableCell className="text-muted-foreground text-xs">Client visibility</TableCell>
            {data.data.map((role) => (
              <TableCell key={role.key} className="text-center text-xs">
                {role.sees_all_clients ? "All" : "Assigned"}
              </TableCell>
            ))}
          </TableRow>
          {groups.map((group) => (
            <Fragment key={group}>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableCell
                  colSpan={data.data.length + 1}
                  className="text-muted-foreground py-1.5 text-xs font-semibold uppercase"
                >
                  {group.replace(/_/g, " ")}
                </TableCell>
              </TableRow>
              {data.permissions
                .filter((p) => p.group === group)
                .map((permission) => (
                  <TableRow key={permission.key}>
                    <TableCell>
                      <div className="text-sm">{permission.description}</div>
                      <div className="text-muted-foreground font-mono text-[11px]">{permission.key}</div>
                    </TableCell>
                    {data.data.map((role) => (
                      <TableCell key={role.key} className="text-center">
                        {role.permissions.includes(permission.key) ? (
                          <CheckIcon className="text-success mx-auto size-4" aria-label="Granted" />
                        ) : (
                          <span className="sr-only">Not granted</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
