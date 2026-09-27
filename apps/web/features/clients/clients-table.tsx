"use client"

import { type ColumnDef, type PaginationState, type SortingState, useTable } from "@tanstack/react-table"
import { Building2Icon, SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDeferredValue, useMemo, useState } from "react"

import { EmptyState } from "@/components/app/empty-state"
import { ErrorState } from "@/components/app/error-state"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { isApiError } from "@/lib/api/errors"
import { formatDate } from "@/lib/format"
import type { Client } from "@/types/api"

import { useClients } from "./api"
import { VatStatusBadge, VerificationIndicator } from "./registration-badges"

/**
 * Clients list. Search, filter, sort and pagination all run on the server; the
 * grid only ever holds the current page.
 */
export function ClientsTable({ createAction }: { createAction?: React.ReactNode }) {
  const router = useRouter()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 })
  const [sorting, setSorting] = useState<SortingState>([{ id: "legal_name", desc: false }])
  const [search, setSearch] = useState("")
  const [vatStatus, setVatStatus] = useState("")
  const q = useDeferredValue(search.trim())

  const sort = sorting[0] ? `${sorting[0].desc ? "-" : ""}${sorting[0].id}` : undefined
  const query = useClients({ page: pagination.pageIndex + 1, perPage: pagination.pageSize, q, vatStatus, sort })
  const rows = query.data?.data ?? []

  const columns = useMemo<ColumnDef<DataGridFeatures, Client>[]>(
    () => [
      {
        accessorKey: "legal_name",
        id: "legal_name",
        header: ({ column }) => <DataGridColumnHeader title="Client" column={column} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="text-foreground truncate font-medium">{row.original.legal_name}</div>
            {row.original.trade_name ? (
              <div className="text-muted-foreground truncate text-xs">{row.original.trade_name}</div>
            ) : null}
          </div>
        ),
        size: 280,
        enableSorting: true,
      },
      {
        id: "taxpayer_identifier",
        header: ({ column }) => <DataGridColumnHeader title="Taxpayer ID" column={column} />,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">{row.original.taxpayer_identifier ?? "–"}</span>
        ),
        size: 170,
        enableSorting: false,
      },
      {
        id: "vat_status",
        header: ({ column }) => <DataGridColumnHeader title="VAT status" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <VatStatusBadge registration={row.original.current_registration} />
            <VerificationIndicator registration={row.original.current_registration} />
          </div>
        ),
        size: 190,
        enableSorting: false,
      },
      {
        id: "effective_from",
        header: ({ column }) => <DataGridColumnHeader title="Status effective" column={column} />,
        cell: ({ row }) => formatDate(row.original.current_registration?.effective_from),
        size: 140,
        enableSorting: false,
      },
      {
        id: "entity_type",
        header: ({ column }) => <DataGridColumnHeader title="Entity" column={column} />,
        cell: ({ row }) => row.original.entity_type_label,
        size: 160,
        enableSorting: false,
      },
      {
        id: "accounting",
        header: ({ column }) => <DataGridColumnHeader title="Accounting" column={column} />,
        cell: () => <span className="text-muted-foreground text-xs">Not connected</span>,
        size: 130,
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        id: "created_at",
        header: ({ column }) => <DataGridColumnHeader title="Added" column={column} />,
        cell: ({ row }) => formatDate(row.original.created_at),
        size: 120,
        enableSorting: true,
      },
    ],
    []
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row: Client) => row.id,
    manualPagination: true,
    manualSorting: true,
    rowCount: query.data?.meta.total ?? 0,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(updater)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    },
  })

  const filtered = Boolean(q || vatStatus)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            placeholder="Search name or exact taxpayer ID"
            aria-label="Search clients"
            className="pl-8"
          />
        </div>
        <NativeSelect
          value={vatStatus}
          onChange={(event) => {
            setVatStatus(event.target.value)
            setPagination((p) => ({ ...p, pageIndex: 0 }))
          }}
          aria-label="Filter by VAT status"
          className="sm:w-48"
        >
          <NativeSelectOption value="">All VAT statuses</NativeSelectOption>
          <NativeSelectOption value="VAT_REGISTERED">VAT registered</NativeSelectOption>
          <NativeSelectOption value="NON_VAT">Non-VAT</NativeSelectOption>
        </NativeSelect>
        <div className="sm:ml-auto">{createAction}</div>
      </div>

      {query.isError ? (
        <ErrorState
          title="Clients could not be loaded"
          correlationId={isApiError(query.error) ? query.error.correlationId : undefined}
        />
      ) : !query.isPending && rows.length === 0 && !filtered ? (
        <EmptyState
          icon={Building2Icon}
          title="No clients yet"
          description="Add a taxpayer with their registration details. VAT status is recorded from the BIR Certificate of Registration and never inferred from transactions."
          action={createAction}
        />
      ) : (
        <DataGrid
          table={table}
          recordCount={query.data?.meta.total ?? 0}
          isLoading={query.isPending}
          loadingMode="skeleton"
          emptyMessage="No clients match these filters."
          onRowClick={(row) => router.push(`/clients/${row.id}/overview`)}
          tableLayout={{ headerSticky: true, dense: false, width: "fixed" }}
        >
          <div className="w-full space-y-2.5">
            <DataGridContainer>
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
            <DataGridPagination sizes={[10, 25, 50, 100]} />
          </div>
        </DataGrid>
      )}
    </div>
  )
}
