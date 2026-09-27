"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CopyIcon, UserPlusIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useMe } from "@/components/app/me-context"
import { StatusBadge } from "@/components/app/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useReferenceData } from "@/features/clients/api"
import { bffFetch } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { applyApiErrors } from "@/lib/api/form-errors"
import { formatDateTime } from "@/lib/format"
import type { Member } from "@/types/api"

function useMembers() {
  return useQuery({ queryKey: ["members"], queryFn: async () => (await bffFetch<{ data: Member[] }>("members")).data })
}

function errorMessage(error: unknown) {
  if (isApiError(error)) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0]
    return field ?? (error.status === 403 ? "Only owners can change owner access." : error.message)
  }
  return "The change could not be saved."
}

export function MembersTable() {
  const me = useMe()
  const members = useMembers()
  const reference = useReferenceData()
  const queryClient = useQueryClient()
  const isOwner = me.role?.key === "owner"
  const update = useMutation({
    mutationFn: ({ id, ...json }: { id: string; role?: string; status?: string }) =>
      bffFetch(`members/${id}`, { method: "PATCH", json }),
    onSuccess: () => {
      toast.success("Member updated")
      return queryClient.invalidateQueries({ queryKey: ["members"] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (members.isPending) return <Skeleton className="h-48" />

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Client access</TableHead>
            <TableHead>Last sign-in</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.data?.map((m) => {
            const locked = m.is_self || (m.role.key === "owner" && !isOwner)
            return (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">
                    {m.user.name} {m.is_self ? <span className="text-muted-foreground text-xs">(you)</span> : null}
                  </div>
                  <div className="text-muted-foreground text-xs">{m.user.email}</div>
                </TableCell>
                <TableCell>
                  <NativeSelect
                    size="sm"
                    value={m.role.key}
                    disabled={locked || update.isPending}
                    aria-label={`Role for ${m.user.name}`}
                    onChange={(e) => update.mutate({ id: m.id, role: e.target.value })}
                  >
                    {reference.data?.roles
                      .filter((r) => isOwner || r.value !== "owner" || m.role.key === "owner")
                      .map((r) => (
                        <NativeSelectOption key={r.value} value={r.value}>
                          {r.label}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {m.role.sees_all_clients ? "All clients" : "Assigned clients only"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs tabular-nums">
                  {m.user.last_login_at ? formatDateTime(m.user.last_login_at) : "Never"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={m.status} />
                </TableCell>
                <TableCell>
                  {!locked ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ id: m.id, status: m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })
                      }
                    >
                      {m.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

const addSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  email: z.email("Enter a valid email address"),
  role: z.string().min(1),
})
type AddValues = z.infer<typeof addSchema>

export function AddMemberDialog() {
  const me = useMe()
  const [open, setOpen] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const reference = useReferenceData()
  const queryClient = useQueryClient()
  const form = useForm<AddValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { name: "", email: "", role: "tax_preparer" },
  })
  const { register, handleSubmit, formState, setError, reset } = form

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const result = await bffFetch<{ data: Member; temporary_password: string | null }>("members", {
        method: "POST",
        json: values,
      })
      await queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success(`${result.data.user.name} added`)
      if (result.temporary_password) setTemporaryPassword(result.temporary_password)
      else setOpen(false)
      reset()
    } catch (error) {
      setFormError(applyApiErrors(error, setError))
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTemporaryPassword(null)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlusIcon aria-hidden /> Add member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            New accounts receive a temporary password shown once. Share it securely.
          </DialogDescription>
        </DialogHeader>
        {temporaryPassword ? (
          <div className="space-y-4">
            <Alert variant="warning">
              <AlertTitle>Temporary password</AlertTitle>
              <AlertDescription>
                <code className="bg-muted mt-1 block rounded px-2 py-1 font-mono text-sm select-all">
                  {temporaryPassword}
                </code>
                This will not be shown again.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(temporaryPassword).then(() => toast.success("Copied"))}
              >
                <CopyIcon aria-hidden /> Copy
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {formError ? (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}
              <Field data-invalid={formState.errors.name ? true : undefined}>
                <FieldLabel htmlFor="member_name">Name</FieldLabel>
                <Input id="member_name" {...register("name")} />
                <FieldError errors={[formState.errors.name]} />
              </Field>
              <Field data-invalid={formState.errors.email ? true : undefined}>
                <FieldLabel htmlFor="member_email">Email</FieldLabel>
                <Input id="member_email" type="email" {...register("email")} />
                <FieldError errors={[formState.errors.email]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="member_role">Role</FieldLabel>
                <NativeSelect id="member_role" className="w-full" {...register("role")}>
                  {reference.data?.roles
                    .filter((r) => me.role?.key === "owner" || r.value !== "owner")
                    .map((r) => (
                      <NativeSelectOption key={r.value} value={r.value}>
                        {r.label}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? <Spinner aria-hidden /> : null} Add member
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
