/** Shapes returned by the Laravel API (apps/api/app/Http/Resources/V1). */

export type PermissionKey =
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "accounting.connect"
  | "accounting.sync"
  | "tax_profile.view"
  | "tax_profile.edit"
  | "tax_rules.view"
  | "tax_rules.manage"
  | "calculations.run"
  | "calculations.adjust"
  | "calculations.approve"
  | "working_papers.view"
  | "working_papers.generate"
  | "forms.view"
  | "forms.generate"
  | "forms.approve"
  | "forms.export"
  | "audit.view"
  | "settings.manage"

export interface Organization {
  id: string
  name: string
  slug: string
  country_code: string
  base_currency: string
  is_demo: boolean
}

export interface Membership {
  id: string
  status: "ACTIVE" | "INVITED" | "SUSPENDED"
  organization: Organization
  role: { key: string; name: string }
}

export interface Me {
  user: { id: string; name: string; email: string; mfa_enabled: boolean }
  organization: Organization | null
  role: { key: string; name: string; sees_all_clients: boolean } | null
  permissions: PermissionKey[]
  memberships: Membership[]
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    correlation_id?: string
    details?: { fields?: Record<string, string[]> } & Record<string, unknown>
  }
}

export interface Option {
  value: string
  label: string
}

export interface ReferenceData {
  entity_types: Option[]
  vat_statuses: Option[]
  status_sources: Option[]
  document_kinds: Option[]
  roles: Option[]
}

export type VatStatus = "VAT_REGISTERED" | "NON_VAT"
export type StatusSource = "BIR_CERTIFICATE" | "USER_ENTERED" | "ADMIN_OVERRIDE"

export interface UserRef {
  id: string
  name: string
}

export interface DocumentSummary {
  id: string
  kind: string
  kind_label: string
  original_name: string
  mime_type: string
  size: number
  sha256: string
  issued_at: string | null
  uploaded_by?: UserRef | null
  created_at: string
}

export interface RegistrationStatus {
  id: string
  vat_status: VatStatus
  vat_status_label: string
  status_source: StatusSource
  status_source_label: string
  effective_from: string
  effective_to: string | null
  is_current: boolean
  verified: boolean
  last_verified_at: string | null
  reason: string | null
  source_document?: DocumentSummary | null
  created_by?: UserRef | null
  created_at: string
}

export interface TaxpayerProfile {
  jurisdiction_code: string
  business_address: Partial<Record<"line1" | "line2" | "city" | "province" | "postal_code", string | null>>
  registration_information: Partial<Record<"rdo_code" | "registered_activities", string | null>>
  registration_date: string | null
  fiscal_year_end_month: number
  accounting_period: "CALENDAR" | "FISCAL"
  currency: string
  notes: string | null
  updated_at: string | null
}

export interface Client {
  id: string
  legal_name: string
  trade_name: string | null
  taxpayer_identifier: string | null
  taxpayer_identifier_masked: boolean
  entity_type: string
  entity_type_label: string
  industry: string | null
  status: "ACTIVE" | "ARCHIVED"
  current_registration?: RegistrationStatus | null
  profile?: TaxpayerProfile | null
  accounting_connections: unknown[]
  current_tax_period: unknown | null
  assigned_users?: (UserRef & { email: string })[]
  created_at: string
  updated_at: string
}

export interface Paginated<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export interface AuditEvent {
  id: string
  action: string
  actor: { type: string; id: string | null; name: string }
  entity_type: string | null
  entity_id: string | null
  client_id: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  ip: string | null
  correlation_id: string | null
  created_at: string
}

export interface Member {
  id: string
  status: "ACTIVE" | "INVITED" | "SUSPENDED"
  role: { key: string; name: string; sees_all_clients: boolean }
  user: { id: string; name: string; email: string; mfa_enabled: boolean; last_login_at: string | null }
  is_self: boolean
  created_at: string
}

export interface RoleMatrix {
  data: {
    id: string
    key: string
    name: string
    is_system: boolean
    sees_all_clients: boolean
    permissions: PermissionKey[]
  }[]
  permissions: { key: PermissionKey; group: string; description: string }[]
}

export interface DashboardData {
  clients: { total: number; vat_registered: number; non_vat: number; registration_unverified: number }
  accounting_connections: null
  tax_periods: null
  exceptions: null
  recent_activity: AuditEvent[] | null
}

export interface SearchResult {
  type: "client"
  id: string
  title: string
  subtitle: string | null
  href: string
}
