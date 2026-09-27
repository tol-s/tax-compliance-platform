import type { Me, PermissionKey } from "@/types/api"

/** UI affordance check. The API authorises every request independently. */
export function can(me: Pick<Me, "permissions">, permission: PermissionKey): boolean {
  return me.permissions.includes(permission)
}
