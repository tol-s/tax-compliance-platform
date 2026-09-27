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
  role: { key: string; name: string } | null
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
