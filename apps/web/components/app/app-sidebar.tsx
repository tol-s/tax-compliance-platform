"use client"

import { LandmarkIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useMe } from "@/components/app/me-context"
import { OrganizationSwitcher } from "@/components/app/organization-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { isActivePath, visibleNavigation } from "@/lib/navigation"

export function AppSidebar() {
  const me = useMe()
  const pathname = usePathname()
  const groups = visibleNavigation(me.permissions)

  return (
    <Sidebar collapsible="icon" aria-label="Primary">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Tax Compliance Platform">
              <Link href="/dashboard">
                <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-md">
                  <LandmarkIcon className="size-4" aria-hidden />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">Tax Compliance</span>
                  <span className="text-muted-foreground truncate text-xs">Philippines</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link href={item.href} aria-current={active ? "page" : undefined}>
                          <item.icon aria-hidden />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <OrganizationSwitcher />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
