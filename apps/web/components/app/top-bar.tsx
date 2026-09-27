"use client"

import { BellIcon } from "lucide-react"

import { AppBreadcrumb } from "@/components/app/app-breadcrumb"
import { CommandMenu } from "@/components/app/command-menu"
import { UserMenu } from "@/components/app/user-menu"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function TopBar() {
  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" aria-label="Toggle navigation" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <AppBreadcrumb />
      <div className="ml-auto flex items-center gap-2">
        <CommandMenu />
        {/* Notification centre arrives with the notifications API (Phase 8). */}
        <Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications">
          <BellIcon aria-hidden />
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
