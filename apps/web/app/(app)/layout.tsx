import { cookies } from "next/headers"

import { AppShell } from "@/components/app/app-shell"
import { requireMe } from "@/lib/auth/me"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireMe()
  const sidebarState = (await cookies()).get("sidebar_state")?.value

  return (
    <AppShell me={me} defaultOpen={sidebarState !== "false"}>
      {children}
    </AppShell>
  )
}
