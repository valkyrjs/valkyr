import type { Permissions as AuthPermissions } from "../../mod.ts";

export const permissions = {
  account: ["create", "read", "update", "delete"],
} as const satisfies AuthPermissions;

export type Permissions = typeof permissions;
