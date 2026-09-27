"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { Me, PermissionKey } from "@/types/api"

const MeContext = createContext<Me | null>(null)

/** Makes the server-fetched principal available to client components. Contains no credentials. */
export function MeProvider({ me, children }: { me: Me; children: ReactNode }) {
  return <MeContext.Provider value={me}>{children}</MeContext.Provider>
}

export function useMe(): Me {
  const me = useContext(MeContext)
  if (!me) throw new Error("useMe must be used inside <MeProvider>")
  return me
}

/** UI affordance only: the API authorises every action independently. */
export function useCan(permission: PermissionKey): boolean {
  return useMe().permissions.includes(permission)
}
