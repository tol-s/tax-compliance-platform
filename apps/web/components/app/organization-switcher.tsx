"use client"

import { Building2Icon, CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { useMe } from "@/components/app/me-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { switchOrganization } from "@/lib/auth/actions"

export function OrganizationSwitcher() {
  const me = useMe()
  const [pending, startTransition] = useTransition()
  const current = me.organization

  const choose = (organizationId: string) => {
    if (organizationId === current?.id) return
    startTransition(async () => {
      const result = await switchOrganization(organizationId)
      if (result && !result.ok) toast.error(result.message ?? "Could not switch organisation.")
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" disabled={pending} aria-label="Switch organisation" tooltip={current?.name}>
              <span className="bg-muted flex size-8 items-center justify-center rounded-md border">
                <Building2Icon className="size-4" aria-hidden />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{current?.name ?? "No organisation"}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {me.role?.name}
                  {current?.is_demo ? " · Demo" : ""}
                </span>
              </span>
              <ChevronsUpDownIcon className="text-muted-foreground ml-auto size-4" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-60">
            <DropdownMenuLabel className="text-muted-foreground text-xs">Organisations</DropdownMenuLabel>
            {me.memberships.map((membership) => (
              <DropdownMenuItem key={membership.id} onSelect={() => choose(membership.organization.id)}>
                <span className="flex-1 truncate">{membership.organization.name}</span>
                <span className="text-muted-foreground text-xs">{membership.role.name}</span>
                {membership.organization.id === current?.id ? (
                  <CheckIcon className="size-4" aria-label="Current" />
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Organisation access is managed by your administrator</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
