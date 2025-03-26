import type { Permissions } from "./permissions.ts";
import type { Role } from "./role.ts";

export class Access<TPermissions extends Permissions> {
  constructor(
    readonly permissions: TPermissions,
    readonly roles: Role<TPermissions>[] = [],
  ) {}

  /**
   * Check if the access instance has any role has been given permission for the
   * given access > action pairing.
   *
   * @param resource - Resource to check assignment for.
   * @param action   - Action to check assignment for.
   *
   * @examples
   *
   * ```ts
   * auth.access([...roles]).has("user", "read"); // => true | false
   * ```
   */
  has<
    TResource extends keyof TPermissions,
    TAction extends TPermissions[TResource][number],
  >(resourceId: TResource, actionId: TAction): boolean {
    for (const { permissions } of this.roles) {
      if (permissions[resourceId]?.includes(actionId) === true) {
        return true;
      }
    }
    return false;
  }
}
