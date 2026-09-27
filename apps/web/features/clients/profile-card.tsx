"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useCan } from "@/components/app/me-context"
import { SectionCard } from "@/components/app/section-card"
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
import { Textarea } from "@/components/ui/textarea"
import { applyApiErrors } from "@/lib/api/form-errors"
import { formatDate, monthName, monthOptions } from "@/lib/format"
import type { Client } from "@/types/api"

import { useClient, useUpdateClient } from "./api"

const schema = z.object({
  line1: z.string().max(255),
  city: z.string().max(120),
  province: z.string().max(120),
  postal_code: z.string().max(16),
  rdo_code: z.string().max(16),
  registered_activities: z.string().max(1000),
  registration_date: z.string(),
  fiscal_year_end_month: z.string(),
  notes: z.string().max(5000),
})
type FormValues = z.infer<typeof schema>

function valuesFrom(client: Client): FormValues {
  const p = client.profile
  return {
    line1: p?.business_address.line1 ?? "",
    city: p?.business_address.city ?? "",
    province: p?.business_address.province ?? "",
    postal_code: p?.business_address.postal_code ?? "",
    rdo_code: p?.registration_information.rdo_code ?? "",
    registered_activities: p?.registration_information.registered_activities ?? "",
    registration_date: p?.registration_date ?? "",
    fiscal_year_end_month: String(p?.fiscal_year_end_month ?? 12),
    notes: p?.notes ?? "",
  }
}

export function ProfileCard({ clientId }: { clientId: string }) {
  const { data: client, isPending } = useClient(clientId)
  const canEdit = useCan("tax_profile.edit")

  if (isPending || !client) return <Skeleton className="h-48" />
  const p = client.profile
  const address = [
    p?.business_address.line1,
    p?.business_address.city,
    p?.business_address.province,
    p?.business_address.postal_code,
  ]
    .filter(Boolean)
    .join(", ")
  const rows: [string, string][] = [
    ["Legal name", client.legal_name],
    ["Trade name", client.trade_name ?? "–"],
    ["Taxpayer ID", client.taxpayer_identifier ?? "–"],
    ["Entity type", client.entity_type_label],
    ["Industry", client.industry ?? "–"],
    ["Business address", address || "–"],
    ["RDO code", p?.registration_information.rdo_code ?? "–"],
    ["Registered activities", p?.registration_information.registered_activities ?? "–"],
    ["Registration date", formatDate(p?.registration_date)],
    ["Fiscal year end", p ? monthName(p.fiscal_year_end_month) : "–"],
    ["Currency", p?.currency ?? "–"],
  ]

  return (
    <SectionCard
      title="Registration information"
      description="As shown on the taxpayer's registration records."
      action={canEdit ? <EditProfileDialog client={client} /> : null}
    >
      <dl className="grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-[12rem_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={label === "Taxpayer ID" ? "font-mono text-xs leading-5" : "font-medium"}>{value}</dd>
          </div>
        ))}
      </dl>
      {p?.notes ? (
        <p className="text-muted-foreground mt-4 border-t pt-3 text-sm whitespace-pre-line">{p.notes}</p>
      ) : null}
    </SectionCard>
  )
}

function EditProfileDialog({ client }: { client: Client }) {
  const [open, setOpen] = useState(false)
  const update = useUpdateClient(client.id)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), values: valuesFrom(client) })
  const { register, handleSubmit, formState, setError } = form

  const onSubmit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        profile: {
          business_address: {
            line1: v.line1 || null,
            city: v.city || null,
            province: v.province || null,
            postal_code: v.postal_code || null,
          },
          registration_information: {
            rdo_code: v.rdo_code || null,
            registered_activities: v.registered_activities || null,
          },
          registration_date: v.registration_date || null,
          fiscal_year_end_month: Number(v.fiscal_year_end_month),
          notes: v.notes || null,
        },
      })
      toast.success("Registration information updated")
      setOpen(false)
    } catch (error) {
      const message = applyApiErrors(error, setError)
      if (message) toast.error(message)
    }
  })

  const text = (name: keyof FormValues, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field data-invalid={formState.errors[name] ? true : undefined}>
      <FieldLabel htmlFor={`profile_${name}`}>{label}</FieldLabel>
      <Input id={`profile_${name}`} {...props} {...register(name)} />
      <FieldError errors={[formState.errors[name]]} />
    </Field>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit registration information</DialogTitle>
          <DialogDescription>Changes are recorded in the audit log with before and after values.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {text("line1", "Street address")}
            <div className="grid gap-4 sm:grid-cols-3">
              {text("city", "City")}
              {text("province", "Province")}
              {text("postal_code", "Postal code")}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {text("rdo_code", "RDO code")}
              {text("registration_date", "Registration date", { type: "date" })}
              <Field>
                <FieldLabel htmlFor="profile_fiscal_year_end_month">Fiscal year ends</FieldLabel>
                <NativeSelect
                  id="profile_fiscal_year_end_month"
                  className="w-full"
                  {...register("fiscal_year_end_month")}
                >
                  {monthOptions.map((o) => (
                    <NativeSelectOption key={o.value} value={o.value}>
                      {o.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            {text("registered_activities", "Registered activities")}
            <Field>
              <FieldLabel htmlFor="profile_notes">Notes</FieldLabel>
              <Textarea id="profile_notes" rows={3} {...register("notes")} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? <Spinner aria-hidden /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
