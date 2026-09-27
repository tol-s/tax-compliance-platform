"use client"

import { useQuery } from "@tanstack/react-query"
import { UsersIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useCan, useMe } from "@/components/app/me-context"
import { SectionCard } from "@/components/app/section-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { bffFetch } from "@/lib/api/client"
import type { Member } from "@/types/api"

import { useClient, useUpdateAssignments } from "./api"

/**
 * People explicitly assigned to this client. Roles that see every client do
 * not need assignment; preparers, accountants and read-only users do.
 */
export function AssignmentsCard({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId)
  const me = useMe()
  // Mirrors the API rule: clients.edit plus organisation-wide client visibility.
  const canManage = useCan("clients.edit") && Boolean(me.role?.sees_all_clients)
  const assigned = client?.assigned_users ?? []

  return (
    <SectionCard
      title="Assigned team"
      description="Preparers, accountants and read-only users see only assigned clients."
      action={
        canManage && client ? <ManageAssignments clientId={clientId} assignedIds={assigned.map((u) => u.id)} /> : null
      }
    >
      {assigned.length === 0 ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <UsersIcon className="size-4" aria-hidden /> Nobody assigned. Managers and reviewers can still see this
          client.
        </p>
      ) : (
        <ul className="divide-y text-sm">
          {assigned.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-1.5">
              <span className="font-medium">{u.name}</span>
              <span className="text-muted-foreground text-xs">{u.email}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function ManageAssignments({ clientId, assignedIds }: { clientId: string; assignedIds: string[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(assignedIds)
  const update = useUpdateAssignments(clientId)
  const members = useQuery({
    queryKey: ["members"],
    queryFn: async () => (await bffFetch<{ data: Member[] }>("members")).data,
    enabled: open,
  })
  const restricted = (members.data ?? []).filter((m) => m.status === "ACTIVE" && !m.role.sees_all_clients)

  const save = async () => {
    try {
      await update.mutateAsync(selected)
      toast.success("Assignments updated")
      setOpen(false)
    } catch {
      toast.error("Assignments could not be saved")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setSelected(assignedIds)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign team members</DialogTitle>
          <DialogDescription>Only members whose role is limited to assigned clients are listed.</DialogDescription>
        </DialogHeader>
        {members.isPending ? (
          <Spinner />
        ) : restricted.length === 0 ? (
          <p className="text-muted-foreground text-sm">No members with client-restricted roles yet.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {restricted.map((m) => {
              const checked = selected.includes(m.user.id)
              return (
                <li key={m.id}>
                  <label className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        setSelected((s) => (value ? [...s, m.user.id] : s.filter((id) => id !== m.user.id)))
                      }
                    />
                    <span className="flex-1 font-medium">{m.user.name}</span>
                    <span className="text-muted-foreground text-xs">{m.role.name}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        <DialogFooter>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? <Spinner aria-hidden /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
