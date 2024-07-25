import type { Access } from "./access.ts";
import type { Permissions } from "./types.ts";

export class Auth<TPermissions extends Permissions> {
  constructor(
    readonly tenantId: string,
    readonly entityId: string,
    readonly access: Access<TPermissions>,
  ) {}
}
