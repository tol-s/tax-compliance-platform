"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { bffFetch } from "@/lib/api/client"
import type { AuditEvent, Client, DocumentSummary, Paginated, ReferenceData, RegistrationStatus } from "@/types/api"

export interface ClientListParams {
  page: number
  perPage: number
  q?: string
  vatStatus?: string
  sort?: string
}

export const clientKeys = {
  all: ["clients"] as const,
  list: (params: ClientListParams) => ["clients", "list", params] as const,
  detail: (id: string) => ["clients", id] as const,
  registrations: (id: string) => ["clients", id, "registrations"] as const,
  documents: (id: string) => ["clients", id, "documents"] as const,
  audit: (id: string, page: number) => ["clients", id, "audit", page] as const,
}

export function useReferenceData() {
  return useQuery({
    queryKey: ["reference"],
    queryFn: async () => (await bffFetch<{ data: ReferenceData }>("reference")).data,
    staleTime: Infinity,
  })
}

export function useClients(params: ClientListParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => {
      const search = new URLSearchParams({ page: String(params.page), per_page: String(params.perPage) })
      if (params.q) search.set("q", params.q)
      if (params.vatStatus) search.set("vat_status", params.vatStatus)
      if (params.sort) search.set("sort", params.sort)
      return bffFetch<Paginated<Client>>(`clients?${search}`)
    },
    placeholderData: keepPreviousData,
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async () => (await bffFetch<{ data: Client }>(`clients/${id}`)).data,
  })
}

export function useRegistrationHistory(id: string, enabled = true) {
  return useQuery({
    queryKey: clientKeys.registrations(id),
    queryFn: async () => (await bffFetch<{ data: RegistrationStatus[] }>(`clients/${id}/registration-statuses`)).data,
    enabled,
  })
}

export function useClientDocuments(id: string, enabled = true) {
  return useQuery({
    queryKey: clientKeys.documents(id),
    queryFn: async () => (await bffFetch<{ data: DocumentSummary[] }>(`clients/${id}/documents`)).data,
    enabled,
  })
}

export function useClientAudit(id: string, page: number, enabled = true) {
  return useQuery({
    queryKey: clientKeys.audit(id, page),
    queryFn: () => bffFetch<Paginated<AuditEvent>>(`clients/${id}/audit?page=${page}&per_page=25`),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** Any change to a client invalidates everything cached for it (details, history, documents, audit). */
export function useInvalidateClient() {
  const queryClient = useQueryClient()
  return (id?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: id ? clientKeys.detail(id) : clientKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["clients", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ])
}

export function useCreateClient() {
  const invalidate = useInvalidateClient()
  return useMutation({
    mutationFn: async (body: FormData) => (await bffFetch<{ data: Client }>("clients", { method: "POST", body })).data,
    onSuccess: () => invalidate(),
  })
}

export function useUpdateClient(id: string) {
  const invalidate = useInvalidateClient()
  return useMutation({
    mutationFn: async (json: Record<string, unknown>) =>
      (await bffFetch<{ data: Client }>(`clients/${id}`, { method: "PATCH", json })).data,
    onSuccess: () => invalidate(id),
  })
}

export function useChangeRegistration(id: string) {
  const invalidate = useInvalidateClient()
  return useMutation({
    mutationFn: async (body: FormData) =>
      (await bffFetch<{ data: RegistrationStatus }>(`clients/${id}/registration-statuses`, { method: "POST", body }))
        .data,
    onSuccess: () => invalidate(id),
  })
}

export function useUploadDocument(id: string) {
  const invalidate = useInvalidateClient()
  return useMutation({
    mutationFn: async (body: FormData) =>
      (await bffFetch<{ data: DocumentSummary }>(`clients/${id}/documents`, { method: "POST", body })).data,
    onSuccess: () => invalidate(id),
  })
}

export function useUpdateAssignments(id: string) {
  const invalidate = useInvalidateClient()
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      (await bffFetch<{ data: Client }>(`clients/${id}/assignments`, { method: "PUT", json: { user_ids: userIds } }))
        .data,
    onSuccess: () => invalidate(id),
  })
}

/** Downloads go through the BFF so the API token never reaches the browser; each download is audited server-side. */
export function documentDownloadUrl(documentId: string): string {
  return `/api/bff/documents/${documentId}/download`
}
