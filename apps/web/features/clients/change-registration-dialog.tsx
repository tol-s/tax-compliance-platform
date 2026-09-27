"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useCan } from "@/components/app/me-context"
import { Alert, AlertDescription } from "@/components/reui/alert"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { applyApiErrors } from "@/lib/api/form-errors"
import { formatDate } from "@/lib/format"
import type { RegistrationStatus } from "@/types/api"

import { useChangeRegistration } from "./api"

const schema = z.object({
  vat_status: z.enum(["VAT_REGISTERED", "NON_VAT"]),
  status_source: z.enum(["BIR_CERTIFICATE", "USER_ENTERED", "ADMIN_OVERRIDE"]),
  effective_from: z.string().min(1, "Enter the effective date"),
  reason: z.string().trim().min(10, "Explain the change in at least 10 characters").max(2000),
  document: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "Attach the supporting document")
    .refine((files) => !files?.[0] || files[0].size <= 20 * 1024 * 1024, "The file must be 20 MB or smaller"),
})
type FormValues = z.infer<typeof schema>

/**
 * The formal, human route for changing registered status: effective date,
 * reason and supporting evidence are all mandatory, and history is preserved.
 */
export function ChangeRegistrationDialog({ clientId, current }: { clientId: string; current: RegistrationStatus }) {
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const canOverride = useCan("settings.manage")
  const change = useChangeRegistration(clientId)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vat_status: current.vat_status,
      status_source: "BIR_CERTIFICATE",
      effective_from: "",
      reason: "",
    },
  })
  const { register, handleSubmit, formState, setError, reset } = form
  const errors = formState.errors

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const body = new FormData()
    body.set("vat_status", values.vat_status)
    body.set("status_source", values.status_source)
    body.set("effective_from", values.effective_from)
    body.set("reason", values.reason)
    body.set("document", values.document[0]!)
    try {
      await change.mutateAsync(body)
      toast.success("Registration status recorded")
      setOpen(false)
      reset()
    } catch (error) {
      setFormError(applyApiErrors(error, setError))
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Change status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change registration status</DialogTitle>
          <DialogDescription>
            The current record (effective {formatDate(current.effective_from)}) is closed on the new effective date and
            kept in history. This change is audited.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {formError ? (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="new_vat_status">VAT status</FieldLabel>
                <NativeSelect id="new_vat_status" className="w-full" {...register("vat_status")}>
                  <NativeSelectOption value="VAT_REGISTERED">VAT registered</NativeSelectOption>
                  <NativeSelectOption value="NON_VAT">Non-VAT</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field data-invalid={errors.effective_from ? true : undefined}>
                <FieldLabel htmlFor="new_effective_from">Effective from</FieldLabel>
                <Input
                  id="new_effective_from"
                  type="date"
                  {...register("effective_from")}
                  aria-invalid={!!errors.effective_from}
                />
                <FieldError errors={[errors.effective_from]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="new_status_source">Source</FieldLabel>
              <NativeSelect id="new_status_source" className="w-full" {...register("status_source")}>
                <NativeSelectOption value="BIR_CERTIFICATE">BIR Certificate of Registration</NativeSelectOption>
                <NativeSelectOption value="USER_ENTERED">Entered by user</NativeSelectOption>
                {canOverride ? (
                  <NativeSelectOption value="ADMIN_OVERRIDE">Administrator override</NativeSelectOption>
                ) : null}
              </NativeSelect>
            </Field>
            <Field data-invalid={errors.document ? true : undefined}>
              <FieldLabel htmlFor="new_document">Supporting document</FieldLabel>
              <Input
                id="new_document"
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                {...register("document")}
              />
              <FieldDescription>
                Required. For a certificate source, upload the updated Certificate of Registration.
              </FieldDescription>
              <FieldError errors={[errors.document as { message?: string } | undefined]} />
            </Field>
            <Field data-invalid={errors.reason ? true : undefined}>
              <FieldLabel htmlFor="new_reason">Reason</FieldLabel>
              <Textarea id="new_reason" rows={3} {...register("reason")} aria-invalid={!!errors.reason} />
              <FieldError errors={[errors.reason]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? <Spinner aria-hidden /> : null}
              Record change
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
