import type { ReactNode } from "react"

import { AppSidebar } from "@/components/app/app-sidebar"
import { MeProvider } from "@/components/app/me-context"
import { TopBar } from "@/components/app/top-bar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { Me } from "@/types/api"

export function AppShell({ me, defaultOpen, children }: { me: Me; defaultOpen: boolean; children: ReactNode }) {
  return (
    <MeProvider me={me}>
      <a
        href="#main"
        className="bg-background sr-only z-50 rounded-md border px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <TopBar />
          {me.organization?.is_demo ? (
            <div className="bg-warning/10 text-warning-foreground border-b px-4 py-1.5 text-xs font-medium" role="note">
              Staging environment · staging data for testing and review. Not for live filing.
            </div>
          ) : null}
          <div
            id="main"
            className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8"
            tabIndex={-1}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </MeProvider>
  )
}
