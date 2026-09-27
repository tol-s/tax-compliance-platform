"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  organizations: "Organisations",
  clients: "Clients",
  overview: "Overview",
  accounting: "Accounting",
  "tax-profile": "Tax profile",
  "tax-periods": "Tax periods",
  calculations: "Calculations",
  "working-papers": "Working papers",
  forms: "Forms",
  exceptions: "Exceptions",
  "audit-log": "Audit log",
  integrations: "Integrations",
  xero: "Xero",
  quickbooks: "QuickBooks Online",
  "tax-engine": "Tax engine",
  rules: "Rules",
  versions: "Versions",
  "test-scenarios": "Test scenarios",
  templates: "Templates",
  reports: "Reports",
  settings: "Settings",
  users: "Users",
  roles: "Roles",
  organization: "Organisation",
  audit: "Audit",
}

function label(segment: string) {
  if (/^[0-9a-f-]{36}$/i.test(segment)) return "Record"
  return LABELS[segment] ?? segment
}

export function AppBreadcrumb() {
  const segments = usePathname().split("/").filter(Boolean)

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`
          const last = index === segments.length - 1
          return (
            <Fragment key={href}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className={last ? undefined : "hidden md:inline-flex"}>
                {last ? (
                  <BreadcrumbPage>{label(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label(segment)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
