import {
  BarChart3Icon,
  BookCheckIcon,
  Building2Icon,
  ChartLineIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  PlugIcon,
  ScaleIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import type { PermissionKey } from "@/types/api"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Hidden unless the user holds this permission. The API enforces it regardless. */
  permission?: PermissionKey
  keywords?: string[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navigation: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
        keywords: ["home", "overview"],
      },
      {
        title: "Clients",
        href: "/clients",
        icon: Building2Icon,
        permission: "clients.view",
        keywords: ["taxpayers"],
      },
      {
        title: "Analytics",
        href: "/analytics",
        icon: ChartLineIcon,
        permission: "clients.view",
        keywords: ["charts", "insights", "trends", "workload"],
      },
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3Icon,
        permission: "clients.view",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        title: "Integrations",
        href: "/integrations",
        icon: PlugIcon,
        permission: "clients.view",
        keywords: ["xero", "quickbooks", "sync"],
      },
    ],
  },
  {
    label: "Tax configuration",
    items: [
      {
        title: "Tax engine",
        href: "/tax-engine",
        icon: ScaleIcon,
        permission: "tax_rules.view",
        keywords: ["rules", "versions", "scenarios"],
      },
      {
        title: "Forms",
        href: "/forms",
        icon: FileTextIcon,
        permission: "forms.view",
        keywords: ["templates", "bir"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Organisation",
        href: "/settings/organization",
        icon: SettingsIcon,
        permission: "settings.manage",
      },
      {
        title: "Users",
        href: "/settings/users",
        icon: UsersIcon,
        permission: "settings.manage",
      },
      {
        title: "Roles",
        href: "/settings/roles",
        icon: ShieldCheckIcon,
        permission: "settings.manage",
      },
      {
        title: "Integration settings",
        href: "/settings/integrations",
        icon: BookCheckIcon,
        permission: "settings.manage",
      },
      {
        title: "Audit log",
        href: "/settings/audit",
        icon: ScrollTextIcon,
        permission: "audit.view",
      },
    ],
  },
]

export function visibleNavigation(permissions: readonly PermissionKey[]): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || permissions.includes(item.permission)),
    }))
    .filter((group) => group.items.length > 0)
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
