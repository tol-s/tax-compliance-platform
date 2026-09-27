"use client"

import { FileTextIcon, GaugeIcon } from "lucide-react"

import { useCan } from "@/components/app/me-context"
import { SectionCard } from "@/components/app/section-card"
import { StatusBadge } from "@/components/app/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatDateTime } from "@/lib/format"

import { documentDownloadUrl, useClient } from "./api"
import { ChangeRegistrationDialog } from "./change-registration-dialog"
import { VerificationIndicator } from "./registration-badges"

/**
 * Registered status, its source and effective date: the facts the tax engine
 * will read. Threshold monitoring is shown alongside as a separate concept
 * that can only ever advise.
 */
export function RegistrationCard({ clientId }: { clientId: string }) {
  const { data: client, isPending } = useClient(clientId)
  const canEdit = useCan("tax_profile.edit")
  const registration = client?.current_registration

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <SectionCard
        title="Tax registration"
        description="Maintained from taxpayer registration information."
        className="lg:col-span-2"
        action={
          canEdit && registration ? <ChangeRegistrationDialog clientId={clientId} current={registration} /> : null
        }
      >
        {isPending ? (
          <Skeleton className="h-28" />
        ) : !registration ? (
          <p className="text-muted-foreground text-sm">No registration status has been recorded.</p>
        ) : (
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs font-medium uppercase">VAT status</dt>
              <dd className="flex flex-col items-start gap-1.5">
                <StatusBadge status={registration.vat_status} className="h-6 px-2 text-sm" />
                <VerificationIndicator registration={registration} />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs font-medium uppercase">Source</dt>
              <dd className="text-sm font-medium" data-testid="registration-source">
                {registration.status_source_label}
              </dd>
              {registration.source_document ? (
                <dd>
                  <a
                    href={documentDownloadUrl(registration.source_document.id)}
                    className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                  >
                    <FileTextIcon className="size-3.5" aria-hidden />
                    {registration.source_document.original_name}
                  </a>
                </dd>
              ) : null}
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs font-medium uppercase">Status effective</dt>
              <dd className="text-sm font-medium tabular-nums">{formatDate(registration.effective_from)}</dd>
              <dd className="text-muted-foreground text-xs">
                Last verified {registration.last_verified_at ? formatDateTime(registration.last_verified_at) : "never"}
              </dd>
            </div>
          </dl>
        )}
      </SectionCard>

      <SectionCard title="Threshold monitoring" description="Observed activity compared with configured thresholds.">
        <div className="flex gap-3">
          <GaugeIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-muted-foreground text-sm">
            Not evaluated yet. Observed revenue is measured from imported accounting data when a tax calculation runs. A
            threshold condition only raises an advisory for human review; it never changes the registered status.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
