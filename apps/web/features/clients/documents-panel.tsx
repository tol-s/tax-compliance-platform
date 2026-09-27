"use client"

import { DownloadIcon, FileTextIcon, UploadIcon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/app/empty-state"
import { useCan } from "@/components/app/me-context"
import { SectionCard } from "@/components/app/section-card"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { isApiError } from "@/lib/api/errors"
import { formatBytes, formatDate } from "@/lib/format"

import { documentDownloadUrl, useClientDocuments, useUploadDocument } from "./api"

export function DocumentsPanel({ clientId }: { clientId: string }) {
  const { data, isPending } = useClientDocuments(clientId)
  const canUpload = useCan("tax_profile.edit")
  const upload = useUploadDocument(clientId)
  const input = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState("REGISTRATION_SUPPORTING")

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const body = new FormData()
    body.set("document", file)
    body.set("kind", kind)
    try {
      await upload.mutateAsync(body)
      toast.success(`${file.name} uploaded`)
    } catch (error) {
      toast.error(
        isApiError(error) && error.fieldErrors?.document?.[0] ? error.fieldErrors.document[0] : "Upload failed"
      )
    } finally {
      if (input.current) input.current.value = ""
    }
  }

  return (
    <SectionCard
      title="Registration documents"
      description="Stored privately. Every download is audited."
      action={
        canUpload ? (
          <div className="flex items-center gap-2">
            <NativeSelect size="sm" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Document type">
              <NativeSelectOption value="CERTIFICATE_OF_REGISTRATION">Certificate of Registration</NativeSelectOption>
              <NativeSelectOption value="REGISTRATION_SUPPORTING">Supporting document</NativeSelectOption>
              <NativeSelectOption value="OTHER">Other</NativeSelectOption>
            </NativeSelect>
            <input
              ref={input}
              type="file"
              className="sr-only"
              accept="application/pdf,image/png,image/jpeg"
              aria-label="Choose document to upload"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button size="sm" variant="outline" disabled={upload.isPending} onClick={() => input.current?.click()}>
              {upload.isPending ? <Spinner aria-hidden /> : <UploadIcon aria-hidden />} Upload
            </Button>
          </div>
        ) : null
      }
    >
      {isPending ? (
        <Skeleton className="h-20" />
      ) : !data?.length ? (
        <EmptyState
          bordered={false}
          icon={FileTextIcon}
          title="No documents"
          description="Upload the BIR Certificate of Registration and any supporting evidence."
        />
      ) : (
        <div className="-mx-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Document</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Download</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="max-w-56 pl-4" title={`SHA-256 ${doc.sha256}`}>
                    <div className="truncate font-medium">{doc.original_name}</div>
                    <div className="text-muted-foreground truncate text-xs">{doc.kind_label}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.created_at)}
                    {doc.uploaded_by ? ` · ${doc.uploaded_by.name}` : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatBytes(doc.size)}</TableCell>
                  <TableCell className="pr-4">
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`Download ${doc.original_name}`}>
                      <a href={documentDownloadUrl(doc.id)}>
                        <DownloadIcon aria-hidden />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  )
}
