"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export const CLIENT_TABS = [
  { segment: "overview", label: "Overview" },
  { segment: "accounting", label: "Accounting" },
  { segment: "tax-profile", label: "Tax profile" },
  { segment: "tax-periods", label: "Tax periods" },
  { segment: "calculations", label: "Calculations" },
  { segment: "working-papers", label: "Working papers" },
  { segment: "forms", label: "Forms" },
  { segment: "exceptions", label: "Exceptions" },
  { segment: "audit-log", label: "Audit log" },
] as const

/** Route-backed tabs: each tab is a URL, so views are linkable and the back button works. */
export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Client workspace" className="-mb-px overflow-x-auto border-b">
      <ul className="flex min-w-max gap-1">
        {CLIENT_TABS.map((tab) => {
          const href = `/clients/${clientId}/${tab.segment}`
          const active = pathname === href
          return (
            <li key={tab.segment}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex h-9 items-center border-b-2 border-transparent px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3",
                  active && "border-primary text-foreground"
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
