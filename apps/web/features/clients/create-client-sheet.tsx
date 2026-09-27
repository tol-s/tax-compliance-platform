"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, TriangleAlertIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { applyApiErrors } from "@/lib/api/form-errors"
import { monthOptions } from "@/lib/format"

import { useCreateClient, useReferenceData } from "./api"

const MAX_BYTES = 20 * 1024 * 1024

const schema = z
  .object({
    legal_name: z.string().trim().min(1, "Enter the registered legal name").max(255),
    trade_name: z.string().trim().max(255).optional(),
    taxpayer_identifier: z
      .string()
      .trim()
      .max(32)
      .regex(/^[0-9A-Za-z\- ]*$/, "Use digits and dashes only")
      .optional(),
    entity_type: z.string().min(1, "Choose the entity type"),
    industry: z.string().trim().max(120).optional(),
    fiscal_year_end_month: z.string(),
    vat_status: z.enum(["VAT_REGISTERED", "NON_VAT"], { error: "Choose the registered VAT status" }),
    status_source: z.enum(["BIR_CERTIFICATE", "USER_ENTERED"]),
    effective_from: z.string().min(1, "Enter the date the status took effect"),
    certificate: z.custom<FileList>().optional(),
  })
  .superRefine((value, ctx) => {
    const file = value.certificate?.[0]
    if (value.status_source === "BIR_CERTIFICATE" && !file) {
      ctx.addIssue({
        code: "custom",
        path: ["certificate"],
        message: 'Upload the BIR Certificate of Registration, or choose "Entered by user".',
      })
    }
    if (file && file.size > MAX_BYTES) {
      ctx.addIssue({ code: "custom", path: ["certificate"], message: "The file must be 20 MB or smaller." })
    }
  })

type FormValues = z.infer<typeof schema>

export function CreateClientSheet() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const reference = useReferenceData()
  const create = useCreateClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      legal_name: "",
      trade_name: "",
      taxpayer_identifier: "",
      entity_type: "",
      industry: "",
      fiscal_year_end_month: "12",
      vat_status: undefined,
      status_source: "BIR_CERTIFICATE",
      effective_from: "",
    },
  })
  const { register, handleSubmit, control, formState, setError, reset } = form
  const errors = formState.errors
  const source = useWatch({ control, name: "status_source" })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const body = new FormData()
    body.set("legal_name", values.legal_name)
    if (values.trade_name) body.set("trade_name", values.trade_name)
    if (values.taxpayer_identifier) body.set("taxpayer_identifier", values.taxpayer_identifier)
    body.set("entity_type", values.entity_type)
    if (values.industry) body.set("industry", values.industry)
    body.set("profile[fiscal_year_end_month]", values.fiscal_year_end_month)
    body.set("profile[currency]", "PHP")
    body.set("registration[vat_status]", values.vat_status)
    body.set("registration[status_source]", values.status_source)
    body.set("registration[effective_from]", values.effective_from)
    const file = values.certificate?.[0]
    if (file && values.status_source === "BIR_CERTIFICATE") body.set("certificate", file)

    try {
      const client = await create.mutateAsync(body)
      toast.success(`${client.legal_name} added`)
      setOpen(false)
      reset()
      router.push(`/clients/${client.id}/tax-profile`)
    } catch (error) {
      setFormError(
        applyApiErrors(error, setError, {
          "registration.vat_status": "vat_status",
          "registration.status_source": "status_source",
          "registration.effective_from": "effective_from",
          "profile.fiscal_year_end_month": "fiscal_year_end_month",
        })
      )
    }
  })

  const invalid = (name: keyof FormValues) => (errors[name] ? true : undefined)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <PlusIcon aria-hidden /> Add client
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add client</SheetTitle>
          <SheetDescription>
            Record the taxpayer and their registration exactly as shown on their registration documents.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} noValidate className="px-4">
          <FieldGroup>
            {formError ? (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <FieldSet>
              <FieldLegend>Taxpayer</FieldLegend>
              <Field data-invalid={invalid("legal_name")}>
                <FieldLabel htmlFor="legal_name">Registered legal name</FieldLabel>
                <Input id="legal_name" {...register("legal_name")} aria-invalid={invalid("legal_name")} />
                <FieldError errors={[errors.legal_name]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="trade_name">Trade name (optional)</FieldLabel>
                <Input id="trade_name" {...register("trade_name")} />
              </Field>
              <Field data-invalid={invalid("taxpayer_identifier")}>
                <FieldLabel htmlFor="taxpayer_identifier">Taxpayer identification number</FieldLabel>
                <Input
                  id="taxpayer_identifier"
                  inputMode="numeric"
                  autoComplete="off"
                  className="font-mono"
                  {...register("taxpayer_identifier")}
                  aria-invalid={invalid("taxpayer_identifier")}
                />
                <FieldDescription>Stored encrypted. Used for exact-match search only.</FieldDescription>
                <FieldError errors={[errors.taxpayer_identifier]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={invalid("entity_type")}>
                  <FieldLabel htmlFor="entity_type">Entity type</FieldLabel>
                  <NativeSelect
                    id="entity_type"
                    className="w-full"
                    {...register("entity_type")}
                    aria-invalid={invalid("entity_type")}
                  >
                    <NativeSelectOption value="">Select…</NativeSelectOption>
                    {reference.data?.entity_types.map((o) => (
                      <NativeSelectOption key={o.value} value={o.value}>
                        {o.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[errors.entity_type]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fiscal_year_end_month">Fiscal year ends</FieldLabel>
                  <NativeSelect id="fiscal_year_end_month" className="w-full" {...register("fiscal_year_end_month")}>
                    {monthOptions.map((o) => (
                      <NativeSelectOption key={o.value} value={o.value}>
                        {o.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="industry">Industry (optional)</FieldLabel>
                <Input id="industry" {...register("industry")} />
              </Field>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Tax registration</FieldLegend>
              <FieldDescription>
                The registered VAT status drives which tax rules apply. It is never changed automatically from
                transaction data.
              </FieldDescription>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={invalid("vat_status")}>
                  <FieldLabel htmlFor="vat_status">VAT status</FieldLabel>
                  <NativeSelect
                    id="vat_status"
                    className="w-full"
                    {...register("vat_status")}
                    aria-invalid={invalid("vat_status")}
                  >
                    <NativeSelectOption value="">Select…</NativeSelectOption>
                    <NativeSelectOption value="VAT_REGISTERED">VAT registered</NativeSelectOption>
                    <NativeSelectOption value="NON_VAT">Non-VAT</NativeSelectOption>
                  </NativeSelect>
                  <FieldError errors={[errors.vat_status]} />
                </Field>
                <Field data-invalid={invalid("effective_from")}>
                  <FieldLabel htmlFor="effective_from">Effective from</FieldLabel>
                  <Input
                    id="effective_from"
                    type="date"
                    {...register("effective_from")}
                    aria-invalid={invalid("effective_from")}
                  />
                  <FieldError errors={[errors.effective_from]} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="status_source">Source</FieldLabel>
                <NativeSelect id="status_source" className="w-full" {...register("status_source")}>
                  <NativeSelectOption value="BIR_CERTIFICATE">BIR Certificate of Registration</NativeSelectOption>
                  <NativeSelectOption value="USER_ENTERED">Entered by user (unverified)</NativeSelectOption>
                </NativeSelect>
              </Field>
              {source === "BIR_CERTIFICATE" ? (
                <Field data-invalid={invalid("certificate")}>
                  <FieldLabel htmlFor="certificate">Certificate of Registration</FieldLabel>
                  <Input
                    id="certificate"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    {...register("certificate")}
                    aria-invalid={invalid("certificate")}
                  />
                  <FieldDescription>
                    PDF, PNG or JPEG, up to 20 MB. Stored privately with its SHA-256 hash.
                  </FieldDescription>
                  <FieldError errors={[errors.certificate as { message?: string } | undefined]} />
                </Field>
              ) : null}
            </FieldSet>
          </FieldGroup>
          <SheetFooter className="px-0">
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? <Spinner aria-hidden /> : null}
              Add client
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
